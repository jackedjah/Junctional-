# MAHWORLD R3 — MASTER IMPLEMENTATION SPEC

Governing continuation spec for the existing MAHWORLD job. Consolidated from
`MAHWORLD_R3_DENSITY_CRYSTALLIZATION_SYSTEMS_CONTINUATION.pdf` so there is ONE canonical memory,
not competing files. The visual laws and the L01–L43 lesson record live in
`docs/mahworld-visual-learning.md` and are still in force; this file is the R3 work contract on top
of them.

Branch: `claude/mahworld-r2-world-craftsman`. Astra's `mrmah3d` character work stays separate.

---

## CONTINUE means

load state → verify build once → resume the exact next action → implement → render the cheapest
proof that can falsify it → compare to the correct reference → keep or revert on the evidence →
regression-check one affected view → record only reusable learning → continue automatically to the
next highest-impact gate → stop only at a real limit.

Do not re-audit the world. Do not ask what to work on. Do not spend credits on prose while obvious
visual failures remain. **If two iterations barely improve a problem, CHANGE METHOD.**

---

## R3-01 · DEAD-ZONE CLOSURE

Every large empty traversable area is classified as one of:

| | class | treatment |
|---|---|---|
| A | deliberately open gameplay space | preserve |
| B | protected vista corridor | preserve |
| C | future water / nature reserve | preserve |
| D | combat / training arena | preserve |
| E | flight / ascent / descent corridor | preserve |
| **F** | **under-authored dead zone** | **fill** |

Only F is filled, and only with MAHWORLD-specific systems — canonical MAHBEINGS, FOBLOCK
micro-stations, music square-diamonds, FOBEAM endpoint nodes, audio-reactive mini-line emitters, low
civic platforms, curved benches and planters, premium crystal clusters, living organism clusters,
transport docks, holographic wayfinding, training artifacts, reflective basins, low-rise support
buildings, ramps/steps/terraces, cultural objects, transit receivers, crystal lanterns, MAHGIC
conduits, service kiosks. Never random futuristic primitives.

> **Empty space must feel intentional. Dense space must feel authored. Neither may feel
> procedurally random.** A dead zone is fixed by giving it function, landmark, circulation, an
> object family, an ecological layer — or deliberate emptiness. Do not blindly maximise object count.

## R3-02 · CRYSTALLIZATION AS LAYERED CONSTRUCTION

Never scatter triangles on a flat box, and never cover every surface with equal facet noise. Build
in layers: **primary silhouette → structural shell → large crystal facets → secondary inset crystal
fields → square-diamond anchors → thin MAHGIC seams → selective platinum rails → controlled
translucent / dark-crystal regions → micro-surface variation only where close enough to matter.**

Buildings gain: larger authored crystalline faces, occasional asymmetrical facet breaks, deep
bevels, clear material boundaries, large readable highlights, inset shadow channels,
refractive/transmissive windows where appropriate, crystalline crowns, square-diamond nodes
integrated into real structure, animated MAHGIC only at purposeful seams and endpoints.

## R3-03 · SEPARATION WITHOUT HUE

Form separation may not depend on colour. In order of preference: silhouette, roughness, specular
width, transmission/opacity, micro-normal/texture, edge-highlight behaviour, recess depth, motion,
localised MAHGIC emission, scale/spacing, atmospheric separation, controlled contact shadows.

Material roles: **HERO PLATINUM** (broad bright reflections, premium smoothness) · **SATIN
PLATINUM** (softer highlight, lower dominance) · **BLACK CRYSTAL** (deep value, controlled
clearcoat/transmission) · **FROSTED CRYSTAL** (softer transmitted light) · **LIVING CRYSTAL**
(subtle internal flow) · **MAHGIC** (sparse energy, never wallpaper glow) · **GLASS** (real
transparency where budget allows) · **GROUND MIRROR** (controlled reflection, not chrome everywhere).

At gameplay camera distance these must all read apart: building vs organism · trunk vs branch ·
branch vs leaf/diamond cluster · MAHGIC beam vs structural rail · foreground vs background ·
platinum vs black crystal · glass vs mirror ground · enemy vs resident · boss vs normal · MAH ASCENT
vs MAH DESCENT · MAH VITAL vs MAH FORGE vs MAH MODE.

## R3-04 · THE FOREST IS NOT ALLOWED TO REMAIN SPARSE

Named failure: *poles + floating fragments rather than a living environment.*

**Branch hierarchy is mandatory: trunk → large branch → medium branch → twig / diamond cluster.**
Plus: far more visible branches, far more leaf-like and square-diamond foliage, foreground /
midground / background vegetation layers, roots that visibly enter terrain and architecture,
canopies that create navigable shade and skyline rhythm, and negative space so it stays readable.
**Do NOT turn it into a generic green jungle.**

Each major organism may carry: dark crystalline trunk tissue, platinum growth rings, square-diamond
buds, leaf clusters from the diamond/kite/rhomboid families, MAHGIC vein lines, tiny FOB nodes,
audio-reactive beam endpoints, translucent crystalline membranes, occasional soft mist shedding.

Animation: restrained slow branch flex, leaf/diamond orientation drift, MAHGIC vein pulse,
travelling endpoint packets, slight glow breathing, audio reaction, occasional coordinated canopy
wave, local response when a player passes.

**The camera test.** From any authored forest camera: foreground has readable organism detail,
midground has overlapping canopy/branch layers, background compresses into a forest MASS instead of
isolated poles.

## R3-05 · EVERY FOBEAM CARRIES THE MINI MUSIC LINE

For every beam: identify the physical emitter, identify the physical receiver, place a small refined
set of vertical audio bars near one or both endpoints, optionally couple a tiny moving line group to
the beam packets. States: IDLE · ACTIVE_AUDIO · QUIET · TRANSITION · DISTANT_LOD. IDLE animates
subtly by default; a later Apple Music integration drives normalised amplitude/band values without
replacing the geometry. No giant equaliser UI, no strobing, no visual obstruction.

## R3-06 · MAH ASCENT COMPLETES ITS DESTINATION

The vertical beams must not stop in the lower atmosphere. Required: ground entry structure → visible
lift or player-entry mechanism → continuous vertical guide/shaft/FOBEAM logic → progression through
tower height → continuation into cloud → visible cloud-penetration destination → connection to the
actual Sky Realm arrival district. From the ground it must be obvious *this goes to the sky world*;
from far zoom the ascent lines visibly connect the civic world to the cloud layer.

## R3-07 · MAH DESCENT

Minimum **three** obvious entrances: Central Civic outer ring · Lake City shoreline · Rainforest
root/canopy transition. Scale ≈ **5× canonical MAHBEING height**. Form: tall rounded rectangular
prism, softened premium corners, platinum outer shell, black-crystal/refractive interior, multiple
crystallization patterns, square-diamond nodes, obvious top/bottom hierarchy, heavy physical base,
visible threshold. Door slides vertically, opens automatically on authorised approach, smooth and
weighty. Downward readability: descending diamond packets, descending light sequence, visible depth
beneath the threshold, downward MAHGIC beam, floor aperture or transparent shaft glimpse,
downward-moving audio mini-lines, MAH DESCENT signage. The cave biome comes later; the entrances and
the traversal contract start now.

## R3-08 · THE THREE FACILITIES

- **MAH VITAL** — heal, recover from combat, buy temporary buffs. Smaller than major facilities,
  jewel-like medical precision, soft platinum shell, black-crystal depth, controlled luminous
  interior, square-diamond medical core, visible treatment/recharge stations, minimal premium
  signage. Buff categories (data-driven, economy NOT locked): Strength, Defense, Speed, MAHGIC
  Capacity, MAHGIC Recovery, Stamina, Regeneration, Flight Stability, Combat Focus.
- **MAH FORGE** — armour, suit material, MAHGIC channel and ability upgrades. Heavier and more
  technical than VITAL: faceted armour-like shell, large square-diamond forge core, visible upgrade
  bays, controlled energy rails, deep material contrast, animated suit/hologram presentation. Must
  read immediately as *this is where my character becomes more powerful*.
- **MAH MODE** — appearance customisation, suit styling, cosmetic shells, accessories, wardrobe
  preview. Social showroom: layered reflective display surfaces, premium fitting pods, holographic
  mirrors, clean square-diamond signage, **canonical MAHBEING mannequins only**. Never overwrite
  another resident's chosen avatar theme or colour.

## R3-09 · MAH NAV

Small unobtrusive button → compact list/grid of named destinations → tap → short confirm/preview →
teleport → closes instantly without breaking movement. Destinations: MAH GYM, MAH MATCH, MAH MARKET,
MAH VITAL, MAH FORGE, MAH MODE, HIGHER TOGETHER plaza, MAH ASCENT, MAH DESCENT sites, Lake City,
Rainforest City. Locked/unvisited may stay unavailable. Teleport presentation: square-diamond
contraction → brief MAHGIC spatial transition → arrival pulse. Fast and premium, not a loading snap.

## R3-10 · MAHBEASTS

Hostile crystallized creature groups. Every family needs a consistent base-body genome, normal
enemies visibly the same species, a narrow level band, one boss at the next tier, boss clearly more
elaborate but unmistakably the same genome, readable weak/attack regions, animation + hit reaction +
defeat behaviour, and performance-safe LOD.

**Quality lock: a jewelry-store creature object — customised, precious, crafted, gift-worthy, but
dangerous.** Deep dark-crystal body core, precision-cut gemstone plates, platinum/chromium joint
jewelry, gemstone eyes, small square-diamond nodes, tiny moving MAHGIC veins, facets resembling
custom jewelry settings, premium claw/teeth forms, controlled micro-reflections. **No realistic fur.
No literal ordinary dog or monkey copy.**

| family | normal | boss | status |
|---|---|---|---|
| Monkey Dogs | L5–7 | L8 | first, at premium quality |
| Shardbacks | L9–11 | L12 | provisional |
| Prism Mites | L13–15 | L16 | provisional |
| Root Crawlers | L17–19 | L20 | provisional |
| Lake Specters | L21–23 | L24 | provisional |
| Cave Brutes | L25–27 | L28 | provisional |

Names besides Monkey Dog are provisional. Never spawn in premium civic pedestrian zones unless
intentionally combat-enabled — use combat clearings, forest zones, lake edges, cave entrances, outer
districts, training wildlands, hostile corridors. Every family needs territory, local visual traces,
an audio cue, and boss emergence/arena space.

## R3-11 · AROUND MAH MATCH

Add MAH VITAL, MAH FORGE, MAH MODE, small FOBLOCK/transit support nodes, combat-oriented service
spaces, compact public artifacts. Do not jam them together — maintain silhouette separation and
circulation. MAH MATCH remains the strongest combat destination.

## R3-12 · LIFE WITHOUT EVERYTHING GLOWING

Micro MAHGIC pulse, travelling packets, audio mini-line movement, crystal internal shimmer, slow
mechanical breathing, organism sway, leaf orientation drift, hover stabilisation, projector scan,
water response, moving reflections. **Avoid** constant full-object pulsing, strobing, synchronised
global motion, random jitter, cheap neon outlines.

## R3-13 · BUDGETS

Density requires stricter budgets: instancing, geometry reuse, shared materials, hierarchical LOD,
distance culling, zone activation, pooled enemies, pooled particles, simplified far foliage,
impostor canopy masses, shadow budgets, reflection budgets, animation tiers, audio-reactive update
tiers. **Far forest = mass + landmark branches. Near forest = premium detail.**

---

## GATE ORDER

1. current-state continuity check · 2. dead-zone classification / debug view · 3. fill under-authored
zones · 4. global material separation · 5. crystallization on major buildings and world objects ·
6. forest branch/foliage/diamond density · 7. forest animation + audio-reactive organisms ·
8. extend MAH ASCENT to Sky Realm · 9. MAH DESCENT shared component · 10. place 3+ DESCENT entrances ·
11. MAH VITAL · 12. MAH FORGE · 13. MAH MODE · 14. MAH NAV · 15. MAHBEAST framework · 16. Monkey Dogs
L5–7 + Boss L8 at premium quality · 17. provisional families · 18. populate authored combat zones ·
19. support structures around MAH MATCH · 20. 360 density/readability review · 21. far-zoom review ·
22. iPhone/gameplay-scale review · 23. performance/LOD closure · 24. repeat the three-largest-failures
loop.

## STANDING PROHIBITIONS (carried forward, still binding)

No public deployment, force-push, merge to production, visibility change, or external invitation. No
reset, destructive clean, or branch switch under another active worker. No new engine, framework
migration, large toolchain, or paid service. Do not rewrite production MAHFITT. Do not invent product
specifications, nutritional claims, partnerships, slogans, prices, memberships, trademarks or
equipment mechanics. No real GPS, private health information, contact lists, or real names by
default. MAH PLAYER remains the only music owner — no second playlist, no extra AudioContext, no
autoplay soundtrack. Never claim "opponent found", fabricate live player counts, or impersonate real
users. Never apply a global red filter or material overwrite that turns all avatars red. Never import
real humans, ordinary cars, third-party brands or UI, or proprietary architecture. The resource name
is **MAHGIC**.

---

## LIVE STATE

**Gates closed.** 1 (continuity) · **6** R3-04 forest branch hierarchy · **8** R3-06 MAH ASCENT to
the Sky Realm arrival district · **9/10** R3-07 MAH DESCENT shared component + 3 entrances · and
R3-13's near/far detail tiers, which is what pays for gate 6.

**Files owned by R3 so far.** `mahascent.js` (new) · `mahdescent.js` (new) ·
`tests/mahworld-r3-laws.test.js` (new) · `rainforest.js` (hierarchy + detail buckets + setDetail) ·
`mahplaza.js` (wiring, `updateDetailTiers`, descent site derivation) · `fobeam.js` (ASCENTS exported
so one table decides where a line stands).

**Next three actions.**
1. Gate 2/3 — dead-zone classification and fill. The far-zoom frame shows the ring between the
   plaza deck (r 43) and the mountain foot (r 620) as almost entirely category F.
2. Gates 11–13 — MAH VITAL, MAH FORGE, MAH MODE, sited per R3-11 around MAH MATCH.
3. Gate 14 — MAH NAV, which the travel system already has the destination table for.

**Highest-risk unresolved visual defect.** The far-zoom lock (R2 §5 / R3 gate 21) still fails: the
mountain ring hides both peer cities from every elevated camera, so far zoom shows one city and two
mountain ranges. Diagnosis harness written and not yet run — `scratchpad/lock5.cjs` projects each
site to screen space and peels it, which separates "occluded" from "present but too dim". That
distinction decides whether the fix is terrain (open the passes wider / drop the ring height on the
two bearings) or value (a city 700 m away needs to emit light, not just exist).

**Proof renders needed to resume.** `l34.cjs <tag>` gives the standing set: world · farzoom ·
farzoom-low · ladder (civic street level) · forest (eye height in the stand) · forest-mid · ascent ·
ascent-top · descent · descent-wide · establishing.

**Suites.** mahplaza 27/27 · crystalline 6/6 · pack 8/8 · skyrealm 16/16 · roam 18/18 · r3 (new).
