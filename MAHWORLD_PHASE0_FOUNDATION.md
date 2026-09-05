# MAHWORLD — PHASE 0 FOUNDATION

**MAHFITT is the control deck. MAHWORLD is the optional world behind it.**

This is the canonical Phase 0 document for MAHWORLD. It records what was
built, what MAHFITT already owns (verified in source, not remembered), the
domain contracts the world will grow from, and the decisions that are locked,
provisional or deferred. Every decision below carries one of three tags:

| Tag | Meaning |
| --- | --- |
| **LOCKED** | Product law. Changing it is a product decision, not an implementation detail. |
| **PROVISIONAL** | Working value or shape, chosen so Phase 0 could be tested. Expected to change; replace through the named seam, never by editing callers. |
| **FUTURE** | Named and reserved so nothing else takes the name or the seat. No mechanics exist. |

Phase 0 is a foundation. It is **not** an MMO, not a game loop, not a
renderer, not a server, and not a schema. Nothing in it is visible to an
ordinary member.

---

## 0. Baseline, branch, artifacts

| Item | Value |
| --- | --- |
| Baseline artifact | `MAHFITT_R85A1_COACH_TABS_PEDOMETER_FUNCTIONALITY_HOTFIX_FULL_SITE.zip` (packet `01_CODE_BASELINE/`) |
| ZIP sha256 | `92cdea7da6b441ee1cd4ffc3afe9934a621965baa09dca84f7e5345c22d52cfe` (matches packet `02_MANIFEST_SHA256.txt`) |
| Baseline tree fingerprint | 358 files, per-file sha256 recorded; combined fingerprint `63525550fb1c70482546b140d0ecadf9` |
| Baseline shell version | `netlify/functions/mygym.js` `const V = 452`, `sw.js` `fob-shell-v452` |
| Phase 0 shell version | `453` in both, the same convention every prior pass used |
| Branch | `claude-mahworld-phase0-control-deck` — an orphan branch whose root commit is the R85A1 tree byte-for-byte, so the diff to the baseline is exactly the Phase 0 work |
| Source-of-truth order used | (1) the R85A1 ZIP, (2) the newest explicit direction (the Phase 0 brief), (3) `MAHFITT_FINAL_PRODUCT_CONTRACT.txt`, (4) `MAHFITT_MAHWORLD_MENU_BRIDGE_ADDENDUM.md`, (5) the visual references, (6) the v445 / v399 handoffs as history only |

Nothing from the v445 or v399 handoffs was used as code truth. Where the
product contract and the current source disagree, the source wins and the
disagreement is listed in §25.

---

## 1. The law — LOCKED

1. **MAHFITT is the menu and the control deck.** Home stays the hub. Every
   member-facing MAHFITT surface keeps its current owner (see §3).
2. **MAHWORLD is optional and opt-in.** A member who never opts in has the
   complete application. With the world OFF nothing in MAHFITT renders,
   loads, waits on or mentions MAHWORLD.
3. **No startup dependency.** `mygym.js` boots identically whether the
   MAHWORLD scripts loaded, failed or were never emitted. Every hook is
   guarded on `window.MAHWORLD` existing AND the development flag being on.
4. **Ordinary members do not see unfinished world functionality.** The
   development flag is device-local, defaults OFF, and the URL switch that
   turns it on is refused on the production deploy context.
5. **MAHWORLD never becomes the fitness database.** Workouts, activity,
   body data, programs, calendar, health, media and AI history stay in their
   MAHFITT owners. The world consumes derived signals through one adapter and
   stores only its own derived state.
6. **Astra's character work is untouched.** No file under `mrmah3d/` and no
   anatomy, renderer, shader or material file was read for, edited by, or
   depended on by Phase 0. The world's Avatar is data; the renderer that will
   one day draw it is not chosen here.

---

## 2. What Phase 0 built

| File | Role |
| --- | --- |
| `mahworld/mahworld-domain.js` | the ONE isolated MAHWORLD domain: flag, state machine, identity rule, contracts, adapter, balancing, anti-exploit boundary, presence privacy, MAHTROPOLIS map, reserved namespaces, adapter binding |
| `mahworld/mahworld-shell.js` | the minimal internal flagged shell page and the presentation hook that writes `data-mahworld-state` |
| `mahworld/mahworld-menu.css` | world-ready menu presentation hooks: state tokens, the one micro-motion prototype, shell rows, reduced-motion pause |
| `mygym.js` | five guarded hunks: the `mahworld` route, two click actions, the Home entry slot, the Settings section, the bridge helpers, one `bind` call at boot success |
| `netlify/functions/mygym.js` | shell emits the stylesheet, the deploy-context flag object and the two deferred scripts before `mygym.js`; `V` 452 → 453 |
| `sw.js` | `fob-shell-v453`; the three new files precached |
| `tests/mahworld-phase0.test.js` | the Phase 0 contract suite (plain Node, same shape as the r85/r90 suites) |
| `tests/mahworld-phase0-browser.js` | real-browser verification: the Netlify-generated shell in headless Chromium on a phone profile, boot stubbed, six scenarios |
| `validation/mahworld/phase0/` | the evidence that run writes: `browser-smoke.json` and the Home / shell / Coach-context screenshots |
| `tests/r85a-*.test.js` (4 files), `tests/r85a-release-gate.py` | version pins 452 → 453, the same move R85A1 made from 451 |
| `calendar.html`, `report-cards.html`, `admin-app.css`, `coach-shell.css`, `netlify/functions/{admin,calendar-admin,fob-payment,fob-progress,form-review}.js` | the R85A1 cache-stamp owners: `?v=452` → `?v=453` and nothing else, so no surface mixes asset generations behind the v453 service worker |
| `MAHWORLD_PHASE0_FOUNDATION.md` | this document |

No Supabase migration, no Netlify function, no server action, no schema and
no network call was added. See §22 for the reserved migration name.

---

## 3. Current MAHFITT ownership map — verified in the R85A1 source

Line numbers are from the baseline `mygym.js` (8354 lines) and
`netlify/functions/mygym.js` unless stated. They were read, not recalled.

### 3.1 Boot, shell, versioning, navigation

| Concern | Owner | Anchor |
| --- | --- | --- |
| HTML shell | `shell()` in `netlify/functions/mygym.js`, served pre-authentication on GET | lines 43–58; stylesheets at 54–56, scripts at 57 |
| Cache identity | `const V` (server) and `const V = 'fob-shell-v…'` (`sw.js`) — must move together, with the nine other stamp owners R85A1 lists | server line 25; `sw.js` line 21 |
| Boot warm-up | inline `<script>` in `shell()` POSTs `{action:'boot'}` before `mygym.js` downloads; `bootRequest()` consumes it | server line 51; client 4695–4701 |
| Client boot | `boot()` — splash, boot request, account/member/roleContext, theme + music hydration, history init, first route | 4727–4743, called once at 8287 |
| Server boot action | `api()` boot branch; theme/music fetched by `accountMemberId`, fitness by `memberId` | server 2297–2319 |
| Routing | `mahfittNavigate(view)` → `mahfittRenderRoute` if-chain, fallback `home()` | 3968–4009 |
| Actions | one delegated click listener on `#mygym` for `[data-a]` | 8102 (baseline) |
| Module consumption | `mygym.js` is one closed IIFE; helpers attach `window.X` and are consumed only through existence checks | e.g. `MAHFITT_UI_STATE`, `FOBMealGradient`, `MAHFITTHealth` |

### 3.2 Accounts, roles, active profile, Coach client context

| Concern | Owner | Anchor |
| --- | --- | --- |
| Account identity | `payment_vip_members.id`; there is no separate profile table | `supabase/migrations/021`, `030` |
| Member session | signed `fob_mygym` token (cookie or body `memberToken`), re-checked against the ledger every request | server 93–122 |
| Role resolution | `_mahfitt-role-context.js` `resolve()`: self / `fob_admin` / `coach_relationship` / 403 `CLIENT_CONTEXT_FORBIDDEN` | 115–157 |
| Client-context denylist | `CLIENT_CONTEXT_AI_ACTIONS` refused with 403 when `roleContext.isClientContext` | server 34, 1943–1951 |
| Client state | `S.account` (signed-in), `S.member` (active fitness profile), `S.roleContext`; `isCoachClientContext()` | 213–218; session key `fob.mahfitt.coachContext.v1` |
| Per-concern owners | fitness → active profile; Theme and music → signed-in account; personal AI → active profile but blocked in client context | role-context `publicContext` 77–94 |

### 3.3 Home, crown, banner, button geometry

| Concern | Owner | Anchor |
| --- | --- | --- |
| Home | `home()` — crown, page context, member head, primary actions, program surface, directory stack, recent | 7029–7031 |
| Primary actions | `HOME_PRIMARY_DEFAULT` (protocol, calendar, progress, meal-gradient, check-in), reorderable, persisted per account | 7008–7028 |
| Directory stack | `.home-directory-stack` of `.mg-button` (COACH MODE conditional, ACTIVITY, ＋ PROGRAM LIBRARY) | 7030 |
| Crown / banner | `mahfittBannerHTML(page,scope,action,label,extra)`, `mahfittPageContextHTML()` | banner system |
| Button geometry | `.ghost` (gym-app.css 227–228, 369) and `.mg-button` (meal-gradient.css 2; mygym.css 266–267), radii and borders forced by `mahfitt-geometry.css` 143–149 | CSS |
| Settings | `settingsPage()` with `.mahset-intro / .mahset-group / .mahset-row / .mahset-action` | 4643 (baseline) |

### 3.4 Theme

| Concern | Owner | Anchor |
| --- | --- | --- |
| Theme state | `THEME_DEFAULT`, `normalizeTheme()`; `applyTheme(raw)` writes ~60 custom properties as inline style on `document.documentElement` — raw Secondary = `--bright` / `--bright-rgb` (also `--secondary(-rgb)`), raw Primary = `--ink(-rgb)`, derived `--card(-rgb)`, `--line`, `--gold`, the Mr.Mah `--fabi-*` ladder, `--mah-atmosphere-*` | 102, 268–295, 299–478 |
| Trap | `--accent-rgb` is NOT the Secondary (accent mixed 20 % toward #C9C9C9) — the world derives from `--bright-rgb` for that reason | 300 |
| Theme ownership | signed-in ACCOUNT: `themeForMember(accountMemberId)` at boot, `saveTheme` with `accountMemberId`; stored as `gym_sessions` rows with `status='theme'`; local `fob.mygym.theme.<accountId>` plus the cross-document bridge key `fob.mygym.theme.active-account.v1` | server 220–247, 2305, 2400–2402; client 296–298 |
| Theme change signal | there is NO theme-change event or hook in the app; the only cross-surface signal is the `storage` event of the bridge key, which fires only in other documents — so the world reads the custom property at render time rather than subscribing | — |
| Theme audio / editor | `setThemeAudio()`, `toggleThemeAudio()`, `stopThemeAudio()`, `openThemeEditor()`; Scene / atmosphere via `mahfitt-atmosphere.js` | 946–953, 1048, 1055, 3805–3820 |

### 3.5 Music — MAH PLAYER

| Concern | Owner | Anchor |
| --- | --- | --- |
| The one engine | one claim-arbitrated engine over two owned media elements (`themeAudio` for the Theme MP3 sequence, `studioAudio` for MAH PLAYER) plus a muted iOS mirror; exactly one owner at a time | 80–89, 1180–1186 |
| The arbiter (the invariant the world must never bypass) | `claimPlayback()` (takeover), `playbackClaimIs()`, `activePlaybackOwner()`, `controlPlaybackOwner()`, `revokePlaybackClaim()` | 1259–1262, 1350–1405 |
| Queue / library | module-level `MUSIC`; `selectMusicTrack()`, `activateMusicTrack()`, `musicNext()`; the player surface is the body-level `#musicStudio` overlay opened by `openMusicStudio()` | 1241, 2695–2765, 3098–3106 |
| Ownership | signed-in ACCOUNT: `musicLibraryForMember(accountMemberId)` at boot, every `music*` action keyed by `accountMemberId`, `roleContext.musicOwnerId = account.id`, `member_music_state` (migrations 035 / 046); the coach profile switch never touches audio (pinned by `tests/r90-audio-ownership.test.js`) | server 2303–2306, 2369–2392; role-context 89 |
| Observe without owning | Listening Intelligence is the canonical pattern: it reads `activePlaybackOwner()`, `activeTransportState()`, `songSeekState()`, `musicPlaybackTime()` and never claims playback — the model for any future world representation of music | 1407–1428 |

### 3.6 Mr.Mah

| Concern | Owner | Anchor |
| --- | --- | --- |
| Shipped Mr.Mah | the 2.5D inline-SVG rig `fabiRigHTML()` (`viewBox 0 0 420 560`), staged by `fabiStageHTML()` and reused by MAH Protocol | 4161, 4417, 5634 |
| AI entry | `MAHFITT_AI_ROUTE = 'mahfitt-ai'` | 1112 |
| 3D renderer | `mrmah3d/` — experimental, development-only, never loaded by the production shell; it lives on the repository's default branch (`claude/mrmah-3d-renderer-poc-1nyunz`), not on this branch; **Astra's, not touched by Phase 0** | that branch's `CLAUDE.md` §2 |

### 3.7 Fitness owners (the truth MAHWORLD may only read through the adapter)

| Destination | Owner in `mygym.js` | Route view |
| --- | --- | --- |
| Programs / Program Library / OUTDOOR | Program system, `homeProgramSurfaceHTML()`, `program-library` | `home`, `program-library` |
| Workout session | `workout()` and the active-workout runtime | workout |
| Activity / movement | movement page, native activity bridge | `movement` |
| Calendar | MAH Calendar (iframe + `calendar.js`) | `calendar` |
| Health | `MAHFITTHealth`, `loadHealth()` | `health` |
| Progress / body | MAH Progress, body progress | `progress`, `body-progress` |
| Media | MAH Media | `mah-media` |
| Protocol | MAH Protocol (`protocolPage()` family) | `protocol` |
| AI | AI Chat | `mahfitt-ai` |
| Coach | Coach Mode, clients, inbox, resources, admin | `coach-*` |

---

## 4. Menu / world state machine — names LOCKED, timings PROVISIONAL

The menu is the control deck; the world is a session the deck can open and
must always be able to close. `mahworld-domain.js` owns the machine.

| State | Meaning | Presentation value |
| --- | --- | --- |
| `WORLD_OFF` | flag off, or profile not enabled — the default for everyone | attribute removed |
| `WORLD_AVAILABLE` | the deck may offer entry | `available` |
| `WORLD_ENTERING` | transition out of the deck | `entering` |
| `WORLD_ACTIVE` | a world session is live behind the deck | `active` |
| `WORLD_EXITING` | transition back to the deck | `exiting` |

Transitions (`TRANSITIONS`):

```
WORLD_OFF        -> WORLD_AVAILABLE                     makeAvailable(profile)   [flag on AND profile.mahworldEnabled]
WORLD_AVAILABLE  -> WORLD_ENTERING | WORLD_OFF          enter() | makeUnavailable()
WORLD_ENTERING   -> WORLD_ACTIVE | WORLD_AVAILABLE      entered() | cancelEntry()
WORLD_ACTIVE     -> WORLD_EXITING                       exit()
WORLD_EXITING    -> WORLD_AVAILABLE                     exited()
```

- **LOCKED:** the five names; illegal transitions are refused and leave the
  state unchanged; the world cannot be switched OFF from `WORLD_ACTIVE` — it
  must exit first; with the flag off `makeAvailable` always fails.
- **PROVISIONAL:** the shell's simulated 700 ms enter and 500 ms exit; the
  `reason` strings; whether `WORLD_ENTERING` may time out on its own.
- **FUTURE:** a real world session behind `WORLD_ACTIVE`.

Subscribers receive every state change (`session.subscribe(fn)`), which is
how the shell repaints and how a future menu choreography would listen.

---

## 5. World-ready menu presentation hooks — LOCKED as hooks, PROVISIONAL as values

The bridge addendum asked for a menu that can express the world without a
new animation system. Phase 0 reserves the hooks and builds one prototype.

| Hook | Where | Rule |
| --- | --- | --- |
| `data-mahworld-state` on `<html>` | written only by `mahworld-shell.js` `paintState()` through `MAHWORLD.presentation.applyState` | absent when OFF, so accepted stylesheets see nothing |
| `--mahworld-energy-rgb` | `:root`, derived from `--bright-rgb` (the Theme Secondary) | the world never writes a Theme property |
| `--mahworld-energy`, `--mahworld-idle-drift` | per-state tokens on `html[data-mahworld-state=…]` | what a future art direction hangs on |
| `--mahworld-motion-cycle` | `:root` | one cycle length, CSS-only |
| `[data-mahworld-entry]` | the Home entry control | `mg-button` geometry untouched; no size, radius, padding or min-height property in the hook |
| `[data-mahworld-page]`, `[data-mahworld-session]` | the shell page root | the shell's own scope |

**Geometry law (LOCKED):** MAHFITT's button geometry is authoritative. The
menu surface texture reference (`04_VISUAL_REFERENCES/02_…`) is inspiration
for surface light only. The exact historical MAHWORLD button choreography was
not recovered and was not reinvented (bridge addendum §10).

### 5a. The concept deck, mapped to what already exists

The MAHWORLD concept image (the MAHFITT deck standing in front of the
MAHWORLD gate) is priority-5 visual reference: it tells us what the deck
*means*, not what geometry to draw. Every element on it already has a
MAHFITT owner; Phase 0 added exactly one control.

| Element in the concept | MAHFITT owner today | Phase 0 |
| --- | --- | --- |
| MAHFITT crown, "MUSIC AND HOLISTIC FITNESS TRACKER", top chevron | crown / banner (`mahfittBannerHTML`) | unchanged |
| PLAYER / MUSIC card (track, transport) | MAH PLAYER, the one music owner, per signed-in account | unchanged; MAHTROPOLIS portal opens it through the app's own action |
| THEME storefront | account Theme (`applyTheme`, theme editor) | unchanged; the world only reads `--bright-rgb` |
| MAH CALENDAR · MAH PROGRESS · MAH HEALTH · CHECK IN | Home primary actions (`HOME_PRIMARY_DEFAULT`) and the `health` route | unchanged (MW-014 pins the primary order) |
| PROGRAMS "train · build · evolve" | Program system, Program Library, MAH PROGRAMS / OUTDOOR | unchanged |
| MR.MAH / AI "your guide, always on" | `mahfitt-ai` route, the 2.5D rig | unchanged |
| ENTER MAHWORLD (full-width, bottom) | did not exist | the ONE new control: `[data-mahworld-entry]`, `.mg-button` geometry, flag-gated, in the directory stack (`WORLD_AVAILABLE` → `ENTERING`) |
| The MAHWORLD gate, "MOVE · MUSIC · GROW · TOGETHER", the diamond emblem | — | the state machine's `WORLD_ACTIVE`; art direction FUTURE |
| City, moon, vehicles, figures, slogans | — | the world environment and copy: FUTURE, not Phase 0, not this branch |

The concept places ENTER MAHWORLD below the fitness deck, after every
MAHFITT destination — which is exactly where the Phase 0 entry sits (last in
the Home directory stack) and the reading the state machine encodes: the
deck is permanent, the gate is optional.

---

## 6. Feature flag behaviour — LOCKED

| Question | Answer |
| --- | --- |
| Key | `localStorage['fob.mahworld.dev.v1']`, the same `fob.*` family as MAHFITT's own keys |
| Default | OFF. `MAHWORLD.flags.isEnabled()` is `false` on a fresh device |
| Sources, in order | `bind({flag})` override (tests / tooling) → the localStorage key. There is no third door: the server-emitted `window.MAHWORLD_FLAGS` carries only the deploy context and can never enable the flag |
| URL switch | `?mahworld=1|dev|on` / `?mahworld=0|off`, honoured only on a local host or when the deploy context is not `production` (`window.MAHWORLD_FLAGS.context`, emitted by the shell from `process.env.CONTEXT`, the same signal `_session.js` and `_payment.js` already read) |
| Production path in | the explicit localStorage key only — an internal capability |
| Off again | Settings → MAHWORLD · DEVELOPMENT → DISABLE DEVELOPMENT MODE, or `?mahworld=0` where allowed |
| Coach client context | the route, the Home entry and the Settings section are all absent regardless of the flag |

What the flag gates in `mygym.js`: `mahworldRouteAllowed()` =
`window.MAHWORLD` present AND `flags.isEnabled()` AND
`!isCoachClientContext()`. With it false the `mahworld` route renders Home,
`mahworldHomeEntryHTML()` and `mahworldSettingsHTML()` return empty strings,
and no `mahworld` markup exists in the DOM.

---

## 7. Identity and role safety — LOCKED

- The WorldProfile owner is the **signed-in account** (`S.account.id`,
  server `roleContext.signedInAccountId`) and nothing else. The active
  fitness profile (`activeProfileId`) is never a world owner.
- In Coach client context `identity.resolveOwner` returns
  `{ ok:false, reason:'CLIENT_CONTEXT_BLOCKED', ownerAccountId:null }`: the
  coach does not become the client's player and the coach's own world is
  not exposed while viewing a client. The shell says so in words.
- A world endpoint, when one exists, follows the `CLIENT_CONTEXT_AI_ACTIONS`
  pattern: refuse in client context, key by the signed-in account, never
  accept a `memberId` target. FOB-admin-only sessions have no account and
  therefore no WorldProfile.
- The local draft store is namespaced by owner:
  `fob.mahworld.profile.v0.<accountId>`. A draft whose owner is missing or
  whose contract is wrong is refused.
- The shell's live world session is bound to one owner. Sign-out, session
  loss, or a different account signing in on the same device discards it
  for a fresh `WORLD_OFF` session (`MAHWORLD_SHELL.syncOwner`, called by
  `mygym.js` at boot success, on SIGN OUT and on session loss), so no member
  ever inherits another member's `WORLD_ACTIVE`.

---

## 8. WorldProfile — contract LOCKED, fields PROVISIONAL

`MAHWORLD.WorldProfile.create(ownerAccountId)` → contract
`mahworld.WorldProfile` v1:

| Field | Default | Note |
| --- | --- | --- |
| `ownerAccountId` | required | the signed-in account |
| `mahworldEnabled` | `false` | the member's opt-in |
| `onboarding` | `not_started` | `in_progress`, `complete` |
| `avatarCreated` | `false` | |
| `avatar` | `null` | an Avatar (§9) once created |
| `attributes` | `FitnessAttributes.create()` | §10 |
| `mahgic` | `Mahgic.create()` | §11 |
| `progression` | `Progression.create()` | §13 |
| `traversal` | `Traversal.create()` | tier `walk` |
| `abilities` | `{ unlocked: [], equipped: [] }` | Ability ids |
| `inventoryRef` | `null` | the Inventory lives in its own boundary (§19) |
| `presenceOptIn` | `false` | presence OFF until enabled |
| `presenceLevel` | `hidden` | |
| `displayRef` | `null` | a public handle, never a real name by default |
| `currentWorldRef` | `null` | `{ worldId, sessionId }` while active |
| `lastDerivation` | `null` | a summary of the last adapter result: `version, xp, signalCount, authority, at` — never the signals |
| `authority` | `local-draft` | `server` once the server has validated |
| `createdAt`, `updatedAt` | ISO | |

**FUTURE:** the server-side row (§22), cross-device sync, deletion on
account removal.

---

## 9. Avatar — renderer-independent, LOCKED as data

`MAHWORLD.Avatar.create(base)` → contract `mahworld.Avatar` v1:

- `base`: `masculine` | `feminine` (the two bases; `Avatar.bases`)
- `appearance`: `{ theme:'inherit', accentRole:'secondary' }` — derives from
  the account Theme, never owns one
- `musculature`: `{ shoulders, chest, back, arms, core, lowerBody }`, each
  0–1, a **derived** state applied only through `applyMusculature`
- `proportion`: `{ stage: 0 }` — the godform's progression stage
- `cosmetics`: `{ equipped: [] }` and `attachments`: `[]` — slots only
- `traversalCapabilities`: `[]` — filled from Traversal
- `abilityVisualState`: `{ active: [], charged: false }` — what an unlocked
  ability shows on the body
- `updatedAt`
- The key set is pinned exactly by MW-090; **no Three.js, mesh, shader,
  geometry or mrmah3d concept appears in avatar data** (tested)

The avatar is what the world knows about the body. How it is drawn, and by
which renderer, is Astra's domain and a later decision.

---

## 10. FitnessAttributes — keys LOCKED, caps PROVISIONAL

`strength, hypertrophy, power, endurance, control (core/control), defense,
quickness (speed/quickness), mahgicCapacity, mahgicRecovery` — all
non-negative numbers, added only through `FitnessAttributes.add(attrs,
deltas, caps)`. Caps in balance v0 are 999 each.

---

## 11. MAHGIC — LOCKED

The canonical energy resource is **MAHGIC** (`MAHWORLD.RESOURCE_NAME`,
`Mahgic.resource`, and the `resource` field on every profile's `mahgic`).
Do not use MAHNAH, MAHNA or MANA in any file, identifier, string or document.

`Mahgic.create({capacity, current, recoveryPerMinute})`; `spend` refuses
overdraft; `recover(m, minutes)` is capped at capacity. Capacity and recovery
are derived from the two MAHGIC attributes by balance v0
(`capacityPerCapacityPoint 10`, `recoveryPerRecoveryPoint 0.1`) —
PROVISIONAL numbers behind a LOCKED seam.

---

## 12. Fitness → signal → progression adapter — boundary LOCKED, balancing PROVISIONAL

```
MAHFITT record  --normalize-->  signal[]  --derive-->  derivation  --applyDerivation-->  WorldProfile
(workout, activity, body)        (no record)             (pure, versioned)   (authority-gated)
```

- **`signals.normalizeWorkout(w)`** accepts MAHFITT's own workout shape
  (`completedAt | date | endedAt`, `items[]` or `exercises[]` with
  `sets[]` carrying `reps`, `weight` and MAHFITT's completion flag `done`;
  `completed` is accepted as an alias). **Completion fails closed: only a
  set with `done === true` (or `completed === true`) becomes a signal**; an
  unticked or unflagged set never does. A set is `strength` at ≤ 5 reps,
  `hypertrophy` at ≤ 15, `endurance` above; an `explosive` flag maps to
  `power`, a `control` flag to `control`.
- **`normalizeActivity(a)`** reads `distanceMeters`, `durationSeconds`;
  **`normalizeBody(b)`** reads `weightKg` / `recordedAt`.
- A signal carries `{ kind, units, region, at, source:{type,id,setIndex} }`
  and **never the record itself** — no exercise name, reps or load leave
  the fitness owner (tested by key set).
- **`derive(signals)`** is pure: inputs untouched, output exactly
  `{ version, signalCount, xp, attributeDeltas, musculatureDeltas,
  mahgicDelta }`, XP an integer, diminishing returns per UTC calendar day
  (`dailySoftCap 40`, `rate 0.35`; ISO strings and numeric timestamps
  bucket alike).
- **Balance table** `BALANCE_V0` is versioned; `setBalance(table)` swaps it
  (a table without a `version` is refused). The curve, classification
  thresholds, XP weights, attribute weights and caps all live there.

### Anti-exploit boundary — LOCKED

`antiExploit.applyDerivation(profile, derivation, {authority})`:

- `antiExploit.validateDerivation` is the gate: the `version` must equal the
  CURRENT balance version, `xp` must be a non-negative integer,
  `signalCount` a number, and `attributeDeltas`, `musculatureDeltas` and
  `mahgicDelta` objects — a bare `{xp}`, a version-only claim, a stale
  version or missing deltas are **thrown out** (tested);
- MAHGIC capacity and recovery are clamped at zero and the balance at
  capacity after every application;
- without `authority:'server-validated'` the result is a **client preview**:
  `profile.authority` stays `local-draft`, `lastDerivation.authority` is
  `client-preview`;
- only a server-validated derivation makes `profile.authority = 'server'`,
  and **a local draft is never server authority**: `store.load` forces
  `local-draft` / `client-preview` on whatever it reads back, so a
  hand-edited draft can claim nothing.

Phase 0 has no server, so every value the shell shows is a labelled
preview on a labelled fixture. **FUTURE:** the server recomputes the same
`derive()` from fitness rows it reads itself (by `member_id = account id`),
and the client's preview is discarded, never merged.

---

## 13. Progression — range LOCKED, curve PROVISIONAL

- Level 1 to 100 (`Progression.MAX_LEVEL`), `levelForXp` monotonic.
- Default curve `quadratic`: XP to reach level L is the rounded sum of
  `100 · i^1.35` for i in 1..L−1 (level 2 = 100, level 50 ≈ 408 533, level
  100 ≈ 2 107 705). A `table` curve is accepted through `setBalance`, which
  is the replacement seam.
- `fromLifetimeXp(x)` carries `level, lifetimeXp, xpIntoLevel,
  xpForNextLevel, progressToNext, milestones, curveVersion`.

---

## 14. Ability contract — LOCKED as a contract, no roster

`Ability.create(spec)` carries: `id, name, sourceCategory, unlock
{level, attributes}, attributeDependencies, mahgicCost, damage, defense,
speed, precision, range, cooldownSeconds, traversalComponent,
movementComponent, constructType`. `Ability.isUnlocked(ability, profile)`
gates on level and attribute requirements. No ability is defined.
**FUTURE:** the roster, balancing, visual states.

## 15. Traversal tiers — reserved, LOCKED names

`walk, sprint, jump, enhanced-jump, climb, levitate, sustained-levitate,
fly, aerial-control`. A profile starts at `walk`. No unlock levels are
hard-coded anywhere; they belong to a future balance table.

## 16. Reserved systems — FUTURE

`MAHWORLD.reserved`: **MAHMATCH** (opt-in, ~five-minute, exercise-inspired
competitive experience, session state separate from persistent
progression), **RACING** (multiplayer traversal competition), **TRAINING
ROOM** (exercise education, ability configuration, progression
understanding; exercise truth from MAHFITT), **FOBBING** (namespace only).
Each is `{ status:'reserved' }` with a one-line concept and no mechanics.

---

## 17. Presence and location privacy — LOCKED

- Presence is **OFF** by default (`presenceOptIn:false`, `Presence.create()
  .optIn === false`) and OFF means `toPublicPayload` returns `null` — no
  payload at all, not an empty one.
- Abstraction levels: `hidden, region, venue, instance, room`. `hidden`
  publishes nothing.
- A public payload is allow-listed by KEY and by SHAPE: only `displayRef,
  level` and the refs the level permits (`regionRef, venueRef, instanceRef,
  shardRef, roomRef`) are copied, and every ref passes `Presence.opaqueRef`
  — a trimmed string of at most 64 characters that is not
  coordinate-shaped and not a `geo:` URI; objects, arrays and numbers become
  `null`. Behind that, `assertNoPreciseLocation` scrubs and
  `containsPreciseLocation` detects, at any depth, the forbidden names
  (`latitude, longitude, lat, lng, lon, latlng, coords, coordinates, geo,
  geohash, geolocation, location, position, accuracy, altitude, gps`) and
  any string value that looks like a coordinate pair.
- Nothing in `mahworld/` reads `navigator.geolocation`, `getCurrentPosition`
  or `watchPosition` (tested), and the domain makes no network call.
- **FUTURE:** what a venue reference is, who may resolve one, and the
  server-side enforcement of the same allow-list.

---

## 18. Themes and music — LOCKED

- The account Theme remains MAHFITT's canonical two-colour state. The world
  **reads** `--bright-rgb` through `getThemeAccent` and derives
  `--mahworld-energy-rgb` from it. It never calls `applyTheme`, never saves a
  theme, never owns a palette.
- **MAH PLAYER is the one music owner**, scoped to the signed-in account
  (`MAHWORLD.music = { owner:'MAH PLAYER', ownerScope:'signed-in account',
  secondQueue:false }`). MAHWORLD may represent or control that owner; it
  never starts a second queue, `Audio` element or `AudioContext`. When the
  world does represent music, it follows the Listening Intelligence pattern
  (observe `activePlaybackOwner()` / `activeTransportState()`, never claim
  playback) and any control goes through the existing claim arbiter.

---

## 19. Inventory boundary — LOCKED

`Inventory.create(owner)`; `Inventory.add` accepts only the reserved kinds
`cosmetic, construct, trophy, consumable`. There is no currency kind, no
trade, no wallet, no blockchain and no real-money transfer anywhere in the
domain (tested). **FUTURE:** where an item comes from.

---

## 20. MAHTROPOLIS destination map — LOCKED as a mapping, routes verified

Each world destination REPRESENTS an existing MAHFITT owner; a portal can
only ever open the canonical MAHFITT surface (`openDestination(id)` calls the
bound `navigate(view)` with the app's own route id, or — for MAH PLAYER,
which is an overlay rather than a route — the bound `openAction('music-
studio')`, which `mygym.js` maps to its own `openMusicStudio()`; it returns
`false` for a future destination).

| Destination | MAHFITT owner | Route (a `view===` `mygym.js` renders) |
| --- | --- | --- |
| Program Gym | Program system (MAH PROGRAMS / OUTDOOR, Program Library) | `home` |
| Training Room | exercise education + Program Tools — **FUTURE** | — (opens nothing yet) |
| Progress | MAH Progress / body data | `progress` |
| Calendar | MAH Calendar | `calendar` |
| Health / Recovery | MAH Health / Activity | `health` |
| MAH Media | MAH Media | `mah-media` |
| MAH Player | MAH Player, the one music owner | not a route: the app's own `music-studio` action (`openMusicStudio()`), through the bound `openAction` |
| Shopping Hub | none yet — **FUTURE** | — |
| Mr. Mah / AI | canonical AI entry (AI Chat / MAH Protocol) | `mahfitt-ai` |
| Protected social spaces | FOB COMMUNITY / coach–member messaging — **FUTURE** | — |
| Exits to open-world regions | **FUTURE** | — |

---

## 21. The internal flagged shell — PROVISIONAL surface, LOCKED rules

Reached only through the guarded `mahworld` route (Home entry
`MAHWORLD` in the directory stack, or Settings → MAHWORLD · DEVELOPMENT).
It renders with MAHFITT's own crown (`mahfittBannerHTML('MAHWORLD', …,
'Back to MAH GYM')`), page context and settings primitives, inside the
existing safe areas, in the account's Theme.

| Group | Rows / controls |
| --- | --- |
| STATUS | `MAHWORLD` · `WORLD OFFLINE / DEVELOPMENT` · session state · owner · `AVATAR STATUS` |
| PROGRESSION | `LEVEL` · `XP` (into level / needed, lifetime, curve version) · `MAHGIC` (current / capacity, recovery) · authority (`local-draft` preview) |
| CONTROLS | ENABLE / DISABLE MAHWORLD for this account (opt-in) · **ENTER MAHWORLD** (dev; `WORLD_AVAILABLE` → `ENTERING` → `ACTIVE`, labelled SIMULATED) · CANCEL ENTRY · EXIT · RUN SAMPLE DERIVATION (fixture, preview only) · RESET LOCAL DRAFT |
| PRESENCE | opt-in state, level (always OFF / hidden in Phase 0) |
| MAHTROPOLIS | one row per destination; a portal navigates to the MAHFITT view, a future one is disabled |

Rules: controls dispatch through `data-mahworld-action` (never the app's
`data-a` router); the shell reads no fitness truth; the session is a
simulation and says so; leaving the page goes through MAHFITT's one
page-teardown owner (`mahfittClosePageSurfaces` → `MAHWORLD_SHELL.unmount`),
which drops pending simulated transitions and settles a half-way
`ENTERING` / `EXITING` back to `AVAILABLE`, so nothing can fire over another
page; a re-render happens only while the shell page is still in the DOM.

---

## 22. Persistence — FUTURE, name reserved

Phase 0 stores only a local draft (§7). The first server-side home for the
WorldProfile is reserved as **`supabase/migrations/054_mahworld_world_profiles.sql`**
— documented here, not written. When it is written it must: key on the
account (`payment_vip_members.id`), be RLS-closed like `021`, be read and
written only by a world action that follows the client-context denylist
(§7), and hold derived state only — never a fitness record.

---

## 23. Performance and engine law — LOCKED

- Motion in the menu layer is CSS-only and compositor-friendly: `transform`
  and `opacity` on one pseudo-element (a static `box-shadow` in one state,
  never a paint property animated per frame), confined to the development
  entry control, and **paused under `prefers-reduced-motion`**. There is no
  app-wide animation loop, `requestAnimationFrame` or interval in the shell's
  page logic.
- The shell's only timers are the two simulated transitions, cleared on
  unmount; `mahfittNavigate` away unmounts.
- **No engine.** No Unity, Unreal, Godot, Babylon, new WebGL framework or
  game-server framework was introduced, and none is chosen by this document.
  WebGL remains scoped to `mrmah3d/` on the renderer branch; this branch
  carries no WebGL at all.

---

## 24. Validation

Run from the repository root:

```sh
node tests/mahworld-phase0.test.js
node tests/mahworld-phase0-browser.js
python3 tests/r85a-release-gate.py
node tests/r85a-canonical-component-closure.test.js
node tests/r85a-source-guards.test.js
node tests/r85a-r82-mrmah-preservation.test.js
node tests/r85a-r83-mrmah-preservation.test.js
node tests/r90-role-context.test.js
node tests/r90-audio-ownership.test.js
node tests/r90a-entry-boot-resilience.test.js
```

Results at this checkpoint: `mahworld-phase0` 96/96, `mahworld-phase0-browser`
47/47, the R85A release gate passing on a clean checkout (it walks the
working directory, so stale tool worktrees under `.claude/` must not be
present when it runs), every current-generation suite (`r85a-*`,
`r85-coach-*`, `r85-data-model`, `r90-*` behavioural, `r90a-*`) passing
with the same counts as the untouched baseline, zero syntax failures across
every JS file.

An independent six-lens review of the diff (flag-off and boot, roles and
privacy, domain correctness, shell and CSS, scope and naming, conventions
and tests) ran before this checkpoint; its confirmed findings are fixed in
this commit: no page-wide flag source, owner-bound shell session, shape
allow-listed presence references, completion failing closed on MAHFITT's
`done`, signals stripped of record detail, strict derivation validation,
local drafts never server authority, transform-only drift, route-boundary
teardown that also clears the world reference, the release gate and every
R85A1 stamp owner moved to 453, and the doc brought into line with the code
(WorldProfile, Avatar, derive output, Inventory kinds, Training Room).

`tests/mahworld-phase0.test.js` covers: isolation and load order; every
`mygym.js` hook guarded; flag default OFF; the state machine; identity and
Coach client context; MAHGIC canonical and forbidden spellings absent;
progression range and replaceable curve; the adapter (completed sets only,
purity, diminishing returns, bare-XP refusal, preview vs server authority);
presence privacy at any nesting depth; renderer-free avatar data; ability,
traversal, inventory and reserved namespaces; every MAHTROPOLIS route is a
view `mygym.js` renders; the shell's primitives, reduced motion and geometry
law; and this document's coverage.

`tests/mahworld-phase0-browser.js` loads the shell the Netlify function
actually emits, in headless Chromium on the iPhone 13 profile, with the boot
API stubbed, and proves in the DOM: (S1) production with the flag off — Home,
Settings and a forced `mahworld` route contain no MAHWORLD markup or text,
no `data-mahworld-state`, no `fob.mahworld.*` key, zero page errors; (S2)
`?mahworld=1` on the production context off localhost is refused; (S3) the
development flow — entry geometry identical to ＋ PROGRAM LIBRARY, shell page
under the crown, ENABLE → AVAILABLE, ENTER → ENTERING → ACTIVE (simulated),
EXIT → AVAILABLE, sample derivation as a client preview, presence payload
null when opted out and coordinate-free when opted in, only the two expected
storage keys, the Calendar portal opening the app's own calendar overlay,
the CSS-only drift on the entry, the Settings section, DISABLE returning the
member experience; (S4) `prefers-reduced-motion` leaves no animation and no
transition on the entry; (S5) Coach client context with the flag on — no
entry, no Settings section, owner refused, no draft written; (S6) the world
scripts returning 404 — MAHFITT boots to Home with no globals and no errors.

The seven historical suites that pin 447/449 (`r85-*`, `r85b-*`, `r90-*`
source guards and Mr.Mah preservation) fail identically at the untouched
baseline and after Phase 0 — that is the version-pin convention of the
earlier generations, not a regression. The current-generation `r85a-*` pins
moved 452 → 453 exactly as R85A1 moved them 451 → 452.

---

## 25. Unresolved decisions

1. **Publishing MAHFITT source.** The GitHub repository is public and has
   never carried the MAHFITT application; the Phase 0 branch's root commit
   is the full R85A1 site. Pushing it publishes production source (the
   Supabase anon key in `community/js/config.js` is public by design;
   service keys are environment-only). Needs an explicit decision: make the
   repository private, push as-is, or push a delta-only branch.
2. **Where the server-validated derivation runs** — a Netlify function
   action on `/api/mygym` (inherits the role resolver and the client-context
   denylist) versus a dedicated world function. Recommended: the former.
3. **The opt-in's home** — the Settings page (today's development section)
   versus a first-run moment in the world. Product decision.
4. **Curve, weights and caps** — every number in `BALANCE_V0` is a
   placeholder behind a versioned seam.
5. **Presence semantics** — what a venue reference is and who may resolve
   it. Nothing may ship presence until this is decided server-side.
6. **The historical menu choreography** — not recovered (bridge addendum
   §10). The hooks exist; the art direction does not.
7. **The product contract vs the source** — the contract describes Home
   buttons (MY LOG, MY HEALTH, TODAY) that the R85A1 source does not render
   on member Home; the source was followed.
8. **The Avatar's renderer** — Astra's `mrmah3d/` is the obvious candidate
   and is explicitly not chosen here.

---

## 26. Recommended Phase 1 — incremental, not an MMO

1. **Server-side WorldProfile** — migration `054`, one `world` action group
   on `/api/mygym` behind the existing role resolver and client-context
   denylist; `boot` gains an optional, best-effort `world` field (the R90A
   degrade pattern) so a failed lookup never breaks boot.
2. **Server-validated derivation** — the server runs the same `derive()`
   over fitness rows it reads itself, writes the profile, and the client
   preview is discarded. This closes the anti-exploit boundary for real.
3. **Real opt-in and onboarding** — the member's `mahworldEnabled` and
   avatar base choice persisted server-side; the Home entry appears only for
   opted-in members once the product flag (not the dev flag) is on.
4. **One presentation pass on the menu** — the art direction for
   `data-mahworld-state` using the reserved tokens, still CSS-only, still
   geometry-preserving, measured under reduced motion and on a phone.
5. **A first world surface that is not a world** — the Training Room as a
   MAHFITT page fed by the exercise system, or the Avatar status card fed by
   derived musculature. Nothing multiplayer; presence stays OFF.

Do not begin Phase 1 without the decisions in §25 items 1–3.

---

## 26a. Visible world milestones (added after Phase 0)

Phase 0 built the foundation, not a visible world. The first visible places
were then built as **development-only runtime scenes** under
`mahworld/scene/`, on the permitted renderer and nothing else:

| Milestone | What exists | Evidence |
| --- | --- | --- |
| Arrival Gate (study v1) | the MAHWORLD gate plaza: wet cobalt plaza, steps, the gate with emblem, wordmark and portal, towers, ribbons, moon; three views, a camera move | `validation/mahworld/arrival-gate/` |
| **MAHPLAZA (world scene v2)** | MAH GYM, MAH MATCH (the fighting facility with a visible square-diamond arena) and MAH MARKET around the plaza; sidewalks, vehicle corridors, the MAHPLAZA civic marker; crystalline residents of many player colours (square-diamond heads, one lower teardrop, physique variation); diamond vegetation; FOB-inspired vehicles; FOBEAMS and FOBLOWS; mountains and a quiet skyline; a **real-time-anchored day/night clock**; player-local world Theme | `validation/mahworld/mahplaza-v2/` — the same cameras at DAY, DUSK and NIGHT, phone views, a red-Theme proof, `tour-night.webm` |

Decisions these scenes add to the register:

- **Renderer (LOCKED):** Three.js 0.185.1 from `mahworld/vendor/three/`, a
  byte-identical copy of the renderer branch's vendored module. No addons,
  no textures, no models, no post-processing, no engine, no toolchain. The
  world never imports from `mrmah3d/`; Mr. Mah's character work is separate.
- **World clock (LOCKED law, PROVISIONAL numbers):** `world-clock.js` is the
  one owner of world time. 24 world hours ≈ 2.5 real hours (1 real minute ≈
  9.6 world minutes), anchored to the player's real local time by varying
  how fast the world moves through daylight versus darkness inside each
  cycle; sunrise is always world 06:00, sunset 18:00; everything is a pure
  function of wall-clock milliseconds, so returning later resumes at the
  right state. Pinning a time exists for validation only.
- **Theme is local to the viewer (LOCKED):** it recolours environmental
  energy only; every resident keeps its own player's colour.
- **Light law (LOCKED):** blue-white only, no yellow; the single red accent
  belongs to MAH MATCH's competitive identity.
- **Species law (LOCKED):** residents share Mr. Mah's language — square-diamond
  head, crystalline facets, humanoid upper body, ONE lower teardrop, never
  legs — at different development stages, never grotesque.
- **What is NOT built (FUTURE):** any game system behind these places —
  combat, matchmaking, commerce, inventory, presence, chat, multiplayer.
  Residents are visual representation only. Nothing here is linked from the
  MAHFITT shell.

The MAHPLAZA scene's own README (`mahworld/scene/README.md`) carries viewing
instructions and the module ownership table.

## 27. Decision register

| # | Decision | Tag |
| --- | --- | --- |
| D1 | MAHFITT is the control deck; Home is the hub; the app is complete with the world OFF | LOCKED |
| D2 | MAHWORLD is opt-in per member and gated by a device-local development flag that defaults OFF | LOCKED |
| D3 | No startup dependency on MAHWORLD; every hook guarded on `window.MAHWORLD` and the flag | LOCKED |
| D4 | One isolated domain (`mahworld/`), UMD, no imports, no network, no document access | LOCKED |
| D5 | State names `WORLD_OFF / AVAILABLE / ENTERING / ACTIVE / EXITING` and their transitions | LOCKED |
| D6 | Shell transition timings (700 / 500 ms) and reason strings | PROVISIONAL |
| D7 | Menu hooks: `data-mahworld-state`, `--mahworld-*` tokens, `[data-mahworld-entry]` | LOCKED |
| D8 | Menu hook values (energy levels, cycle length, hairline texture) | PROVISIONAL |
| D9 | Button geometry is MAHFITT's; the hook may not change it | LOCKED |
| D10 | Owner = signed-in account; Coach client context has no world owner | LOCKED |
| D11 | WorldProfile field set | PROVISIONAL |
| D12 | Avatar is renderer-independent data with two bases | LOCKED |
| D13 | FitnessAttributes keys | LOCKED |
| D14 | Attribute caps, XP weights, classification thresholds, diminishing returns | PROVISIONAL |
| D15 | The resource is MAHGIC | LOCKED |
| D16 | Adapter boundary: normalize → derive → applyDerivation; signals carry no record | LOCKED |
| D17 | Client can never assert XP; preview vs server-validated authority | LOCKED |
| D18 | Level 1–100 | LOCKED |
| D19 | Quadratic curve (100, 1.35) | PROVISIONAL |
| D20 | Ability contract fields | LOCKED |
| D21 | Ability roster | FUTURE |
| D22 | Traversal tier names | LOCKED |
| D23 | Traversal unlock levels | FUTURE |
| D24 | MAHMATCH, RACING, TRAINING ROOM, FOBBING | FUTURE |
| D25 | Presence OFF by default; no precise location in any public payload; levels `hidden…room` | LOCKED |
| D26 | Presence semantics and server enforcement | FUTURE |
| D27 | Theme stays MAHFITT's; the world derives its energy colour from the Secondary | LOCKED |
| D28 | MAH PLAYER is the one music owner | LOCKED |
| D29 | MAHTROPOLIS destinations map to existing owners; future ones open nothing | LOCKED |
| D30 | Inventory kinds; no currency, trade, wallet, blockchain or real-money transfer | LOCKED |
| D31 | Shell layout and rows | PROVISIONAL |
| D32 | `054_mahworld_world_profiles.sql` reserved, not written | FUTURE |
| D33 | CSS-only motion, reduced-motion pause, no engine | LOCKED |
| D34 | Cache identity 453 with the four `r85a-*` pins | LOCKED (this pass) |
| D35 | Astra's character files untouched; renderer for the Avatar not chosen | LOCKED (Phase 0) |
| D36 | The shell's world session is bound to one owner account; sign-out or another account discards it | LOCKED |
| D37 | Public presence references are opaque strings (≤ 64 chars, never coordinate-shaped); objects and arrays are dropped | LOCKED |
| D38 | A derivation is applied only under the current balance version with every delta present; a local draft is never server authority | LOCKED |
| D39 | Completion fails closed: MAHFITT's `done` (or `completed`) must be `true` for a set to count; signals carry no record detail | LOCKED |
