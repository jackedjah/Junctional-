# MAHWORLD — M7 HALO enlargement, elevator-only access, and road-gradient continuation

**Execution addendum for the same existing Sol High gameplay job.**
**Prepared:** 24 September 2026. **Status:** instruction/research only; no game changes or deployment performed by this document's author.

## 0. Owner direction and precedence

The owner has played M7 and likes the direction, especially the gold-to-pink road gradient. Continue from M7 or newer valid work, not from B8 or a fresh scene.

New explicit direction:
1. Extend the successful smooth road-color transitions throughout appropriate connecting routes.
2. Raise the tree/elevator's upper arrival approximately **10 times** the reviewed M7 height.
3. Enlarge the actual HALO dome approximately **15–20 times** the reviewed M7 linear size.
4. Make the dome a contained, usable elevated realm. **Normal gameplay entry and exit are by the elevator only. No flying into or out of the dome.**
5. Improve the visual finish while enlarging it. Do not exchange smooth geometry, source fidelity, material definition or responsiveness for mere size.

This overrides earlier compact-height/compact-dome limits and any permission to reach or leave HALO by free flight. It does not erase other accepted M1–M7 work or authorize an engine migration, new economy, another giant quest campaign, or production publication.

**Interpretation, explicitly declared:** 10× applies to ground-to-upper-arrival elevation. 15–20× applies to dome diameter/radius and its corresponding shape, not merely area or a camera zoom. Use **18×** as the first candidate within that range. These are separate factors; never multiply them together or multiply the whole world. This interpretation is a new implementation proposal, not a past owner measurement.

Preserve camera-heading independence, direct attacks, flight controls, fusion, exercise identity, gear ownership, existing combat/resource balance, original Dogkie materials, actual Moon, improved trees, blue MAH GYM, the repaired junction, and the unfinished JOB A/B ledger.

## 1. Starting state and scoped code map

Remote checked for this addendum:
- Repository: `jackedjah/Junctional-` (previously verified public; recheck before pushing new material).
- Recovery branch: `backup/mahworld-m6-20260924T190351Z`.
- Checked tip: `fe1a35b46c4995df8f149bfef4376d16a31833f5`.
- Existing review build: `ASTRA_M7_REFERENCE_LOCK_PRIVATE_20260924`.
- Existing review deploy: `6ab5acc1077641dc53f2b30b`.

These are recovery anchors, not instructions to reset a newer local state.

Local gameplay root:
`C:/Users/jahsu/Downloads/MAHWORLD_CHARACTERS/CLAUDE_GAMEPLAY_RUNTIME`

Read compact current state once:
- `25_HANDOFF/CONVERGENCE/CONTINUE_HERE.md`
- `25_HANDOFF/CONVERGENCE/ASTRA_TAKEOVER_STATE.md`
- `25_HANDOFF/CONVERGENCE/M7_EXECUTION_LEDGER.md`
- Current M7 reference packet pointers and only affected ledger sections.

Relevant paths confirmed in the checked M7 changes:
- `26_LOCAL_AUTHORITY/lab/cityScene.js`: `treeElevator` geometry, materials, cabin, branches, dome and published visual envelope.
- `26_LOCAL_AUTHORITY/play/PlayMode.js`: authoritative transit, movement, support/flight and upper guide integration.
- `26_LOCAL_AUTHORITY/play/rules1723/rules_17_23.dev.json`: existing landmark/configuration data; locate actual current defining records before editing.
- `26_LOCAL_AUTHORITY/lab/fieldScene.js` and `lab/play.js`: presentation driven by host transit state and viewer updates.
- `26_LOCAL_AUTHORITY/lab/world/terrain.js`, `roadNetwork.js`, `worldLayout.js`: existing color/road/support systems; inspect only relevant functions.
- Existing district/collider generators and generated outputs named by the current build dependencies.
- `26_LOCAL_AUTHORITY/deploy/build_static_demo.mjs`: published build metadata, including previously hardcoded tree dimensions.
- `16_TESTS/gameplay_district.test.mjs`, `gameplay_emotes_npc.test.mjs`, `gameplay_world_jobb.test.mjs`: existing height/transit/guide assumptions.

**Verified trap in the checked renderer:** `treeElevator` computes `DR = Math.min(PR - 0.3, 8.2)`. Changing platform radius alone will leave the dome capped at 8.2 m. Replace the obsolete cap with shared, explicit geometry parameters; do not just enlarge the platform and claim the dome grew. The same function has old absolute trunk profile heights, cabin offsets, support radii, bench/focus positions and rail counts. Re-author their relationships selectively; a single parent `.scale` is not this job. [P1]

JOB B owns authored landmark/road appearance and shared layout inputs. JOB A owns authoritative transit, access, flight and controller behavior. One lead can execute both in sequence, but presentation must not become a second movement authority.

## 2. Absolute scale contract — apply once

Measured from the checked M7 source and saved ledger, not from a concept-image pixel estimate: [P1, P2]

| Parameter | Reviewed M7 baseline | First candidate target |
|---|---:|---:|
| Ground-to-upper-deck elevation | 24 m | **240 m** (10×) |
| Dome shell radius | 8.2 m | **147.6 m** (18×) |
| Dome shell diameter | 16.4 m | **295.2 m** (18×) |
| Upper structural deck radius | 8.5 m | **153 m** (18×), subject to coherent sealed-rim detailing |
| Dome apex above baseline ground | 32.2 m | **387.6 m**, for the retained hemispherical proportion |
| Ground base radius | 6.2 m reported | Not multiplied automatically; adjust structural needs locally and explicitly |
| Current ascent duration | 5.4 s | Retune deliberately; do not carry 5.4 s blindly into a 240 m ride |

The full allowed dome-diameter range from that baseline is **246–328 m**. The first target is 295.2 m. A round floor enlarged 18× in diameter has **324× its original area**; this is arithmetic, not a requirement for 324× as many props, actors, draws, or textures.

Store a small versioned record with baseline commit, baseline dimensions, selected factors and resulting absolute dimensions. Re-running the job must produce the same dimensions. Never apply another 10×/18× to a partially updated scene.

Use `baseY + 240 m` for the upper-arrival elevation relative to the actual local base. Distinguish floor height, shell radius, top/apex height and support-envelope radius. Reconcile every derived visual, collision, navigation, cabin, guide, prompt and build-info value from one canonical description.

The deck may have a structural apron outside the shell, but it is **not an accessible exterior exit balcony**. The playable promenade stays inside the sealed enclosure. Remove route/sign cues that advertise a walkable outside terrace.

Do not enlarge avatars, equipment, benches, doorways, text, windows or the ground town by 18×. Human/MAHBEING-scale detail is what makes the larger building read as enormous.

## 3. A grand realm, not a stretched display model

Keep the reference's engineered platinum tree, glazed blue core, curved branch supports, spiral/straight structural rhythm and clean diamond identity. Extend and reshape that structure to carry the enlarged crown visibly and coherently.

- Rework trunk taper, branch trajectories, cross-sections, docking joints, load-distribution collars and underside ribs at the new dimensions. Do not leave eight pencil-thin old supports stretched across a 300 m span.
- Preserve the surrounding ground city and entrance approaches. Strengthen the base only as required by the composition and usable boarding layout; do not multiply its footprint by the tower-height factor.
- Smooth load-bearing forms and broad continuous highlights remain essential. Intentional crystal facets belong at meaningful nodes, not as cheap sharpness everywhere.
- Use an articulated upper structure with clear joints, local secondary ribs, accurate thickness and polished/softened edges. No unsupported floating rim pieces or a paper-thin floor.
- Retain the current upper activities/guide and build a usable layout around them: arrival court, readable return lobby, promenade loop, overlook bays behind the glass, and selected resting/landscape pockets using existing approved assets.
- Vary proportions and color gently across these areas. Do not generate a new city, a new social backend or hundreds of NPCs to fill the new area.
- Make the lift-return landmark visible and consistently signposted from the expanded interior. The owner must be able to find the only exit without a long confusing search.
- Preserve views into the fantasy world through the enclosure. Clear crystalline glass with platinum/blue structural framing is preferred to an opaque bubble or an almost invisible collision wall.

The larger footprint will change the town's overhead silhouette and lighting. Inspect it from several existing roads and from inside HALO. Model and light the underside so it belongs in the world; do not conceal an overwhelming disc with fog or disable its physical depth test. Keep the actual Moon and established day/night identity intact.

## 4. Elevator-only access is a gameplay rule, not a decorative wall

Implement a **closed, two-sided spatial boundary**: floor, perimeter/skirt, curved shell/ceiling and elevator vestibule. Both inside-out and outside-in movement must respect it. A transparent material or a single-sided render mesh is not an access controller.

Required behavior:
- Outside players cannot enter HALO by flight, jumping, dashing/fast travel input, knockback, transformation, click-to-move, walking the support branches or slipping through a seam.
- Inside players cannot fly, walk, fall, launch, clip or navigate out. The elevator is the only normal gameplay route back to the ground.
- Interior flight may remain available **within the enclosure**. Do not globally disable the player's flight mechanic just to satisfy the access rule.
- Closed glass or magical membrane provides a visible explanation for blocked travel, with restrained contact response. No giant opaque walls, harsh repeated banners or new damage penalty just for touching glass.
- A request to walk/click outside remains rejected or constrained inside; do not quietly teleport the actor to the exterior target.
- Gate ownership follows the host's accepted transit/session state, not merely whether an actor's X/Z happens to fall under the huge deck.
- Do not grant admission because the camera is inside, the actor overlaps a region radius, or a locally editable cosmetic flag changes.
- Gate prompts require correct position **and altitude/region**, including the HALO guide and DOWN elevator. No ground player calling the upper interaction through 240 m of empty space.

**Flight/support integration is critical:** the old outdoor flight ceiling is not a sufficient boundary. The new deck is above the previously discussed outdoor flight range. The elevator must deliver the actor without the outdoor flight clamp snapping them to the ground; interior flight uses a domain-local supported height and the remaining shell clearance. Keep outdoor flight policy unchanged. Do not raise the global flight ceiling and let every outside player enter HALO.

**Prevent the giant-roof bug:** the expanded 153 m deck support must not become the ground height for everyone underneath it. Floor/support queries must consider actor domain, current vertical interval and valid support transitions. Players directly below the dome stay on the actual city ground; inside actors stay on the upper floor. No accidental 240 m landing snap, no underside teleport, no phantom elevated creature spawn.

Use the current collider/movement pipeline with swept collision or an equivalent continuous boundary constraint for high-speed motion. Endpoint-only detection can miss crossing through a thin barrier. Preserve tangential sliding, camera control and reasonable separation margins; do not repeatedly teleport the player backward or shorten their body to fit.

For a hemispherical proposal, a point-level geometric model is a ball of radius R above the deck plane. This is only a layout model: actual acceptance must constrain the **whole character capsule/body envelope** and its swept motion, not just a feet point. Shell thickness, contact margin, floor support and vestibule exceptions are separate defined values. Shared geometry and collider parameters must produce matching boundaries.

Projectiles, enemies, guide companions and freely orbiting equipment must not cross the enclosure accidentally or hit targets through it. Preserve existing noncombat HALO behavior. Companion-follow and projectile cleanup must respect the transit/domain change without stealing ownership or granting free refills.

## 5. Ascent, return, failure recovery

Extend the existing `TRANSIT` mechanism rather than build a second elevator or controller.

Suggested authority progression, adapted to existing names:
`GROUND → BOARDING → ASCENDING → HALO → BOARDING_RETURN → DESCENDING → GROUND`.

- Boarding requires presence at the genuine ground dock and a valid existing state. Flight cannot enter an open shaft beside the cabin.
- Use a closed/controlled vestibule or equivalent narrow transit boundary. Open only the required doorway at the dock, never disable the entire dome collider during arrival/departure.
- Cabin, passenger, carried equipment and companion follow the same accepted timeline. No host already-at-destination while the visible player rides hundreds of metres below with live upper-room interactions.
- Keep manual camera orientation; do not force a spinning camera or create repetitive body bobbing.
- At arrival, complete the host domain transition and door clearance before permitting free movement. Reject repeated UP/DOWN spam and mid-ride conflicting navigation.
- Both ways remain usable even at zero flight or combat MAHGIC. Keep elevator transport cost zero as in M7; no stamina dependence for the only exit.
- Retune duration rather than using the old 5.4 seconds uncritically. **20 seconds one way is an initial proposal**, not an owner-mandated final value. Use smooth acceleration/deceleration, readable passing structure and continuous motion. Keep loading out of active motion where feasible.

The existing quintic smootherstep can be retained:
`u = clamp(elapsed / duration, 0, 1)`
`s(u) = 6u^5 - 15u^4 + 10u^3`
`y = y0 + (y1 - y0) * s(u)`.
For a straight 240 m ride lasting 20 s, the mathematical peak speed is `1.875*240/20 = 22.5 m/s`, and peak acceleration is approximately `5.7735*240/20^2 = 3.46 m/s²`. These are planning calculations, not measurements of an implemented ride. Use the same normalized phase in host and presentation.

Recovery rules:
- Reload/reconnect during the ride resumes the accepted ride or restores to its last valid dock under the existing persistence policy. Never spawn in the sky or make repeated reconnects a free world teleport.
- A legitimate HALO save restores inside the safe enclosure, not outside a rescaled wall. Versioned layout migration may remap an old valid internal save to the new internal arrival court once, without changing resources/progress.
- In-domain failure/respawn recovery must not become an ordinary exit shortcut. Preserve game death rules; use a documented safe internal location where consistent. Do not invent a new combat penalty or permanent player trap.
- If the carrier is unavailable or an interrupted state is invalid, route recovery through the existing elevator/dock authority. Keep an accessible internal return control. The owner can still leave the application normally.
- Camera collision should keep normal interior camera travel inside the envelope while permitting views through clear glass. Do not fix camera penetration by altering player-facing independence.

## 6. Extend the road gradients the owner liked

Treat the gold-to-pink road as an **accepted visual reference**. Locate its current route/material data and capture one matched reference view before adjusting connected links. Do not replace that look with a new palette experiment.

Apply the same smooth transition method to appropriate gold, hot-pink, sapphire, violet and crimson route connections, including the HALO arrival/promenade where useful. Keep regional identities and purposeful path contrast; this is not random full-spectrum paint on every surface.

- Use the existing single road graph and material/vertex-color system.
- Reuse shared junction colors and the fixed 128-segment boundary method. Preserve source-owned topology rather than laying translucent gradient rectangles over roads.
- Blend palettes in the renderer's established linear working space; do not convert already-linear colors a second time. [R1]
- A normalized smoothstep weight `t*t*(3-2*t)` along an authored transition interval is an available shaping tool, not a mandate to replace a working interpolation.
- Make neighboring segments share endpoint values and spatial scale. Preserve widths, traversal/collision and map-sign agreement.
- Keep dark graphite/platinum and material variation visible under the accent. Avoid overexposed white junctions, muddy bands, hard tile boundaries and motion-dependent shimmer.

## 7. Quality preservation at this scale

The requested enlargement is substantial. It must not be delivered as an empty low-detail shell, but neither should render cost be multiplied by floor area.

**Do not sacrifice source fidelity:** preserve texture roles, curved silhouettes, normals, visible joints, original glass/platinum material character, readable night lighting and M7 controls. Do not blur the whole scene, restore all raw 8K textures everywhere, or globally lower quality until a benchmark looks better.

Implement detail by viewing need:
- Keep surfaces at coherent physical texture/normal scale; do not stretch one old texture across 18× the span. Reuse tiling/detail resources with non-repeating macro variation where needed.
- Rebuild dome curvature and ribs with a screen-space silhouette budget. Increasing radius with unchanged coarse tessellation can expose chord facets at the new scale. Choose segmentation from matched close/inside/distant views, not maximum subdivision everywhere.
- Share and instance repeated ribs, fittings, lights and furniture where appropriate. Recompute relevant bounds after transforms; otherwise enlarged objects may disappear or cull incorrectly. [R2]
- Keep glass readable from inside and outside. Inspect sorting, front/back faces, glass-cloud interactions and screen coverage using the installed renderer. Do not assume adding `DoubleSide` or a fixed `renderOrder` fixes all transparency. [R3]
- Use shared prepared environment lighting and bounded local light pools. Do not create a real-time cube camera or shadow-casting light for every pane.
- Keep under-dome and interior lighting consistent with the world. Use restrained blue/cyan architectural fill and class-gradient path light; avoid a luminous dome bleaching the town.
- Check camera near/far, sky placement, altitude-dependent fog and cloud layers at the new deck/apex. Clouds must not accidentally slice through the usable interior. Do not hide the real Moon or resurrect the removed near ridge.
- Whole-structure collision can use efficient analytic/segmented proxies; do not create a rigid body for every transparent triangle. Match the actual silhouette closely enough to avoid invisible offsets and entry gaps.
- Use bounded interior furnishing and regional activation. Far people/objects do not need full-rate animation because the dome is larger.

Before declaring quality maintained, compare the same M7 ground view, a new underside/approach, the arrival lobby, an interior panoramic view, and the enclosure at close range. Record actual frame/resource observations with the existing harness. A single desktop render time is not a physical-phone or thermal claim. If a new bottleneck appears, fix its responsible layer rather than silently shrinking the requested dome or reducing the whole game's clarity.

## 8. Bounded execution, persistence and GitHub

1. Read current handoff/ownership and capture the accepted M7 dimensions/gradient once. Preserve any running operation at its safe checkpoint and any newer valid edits.
2. Save a scoped source checkpoint before the large layout change. Update the existing scale/access specification and generators together.
3. Implement shell/deck/structure scale and the elevator-only domain contract. Finish a functional up/down route before filling the realm with decoration.
4. Complete the visual finish and replicate the accepted gradient language over connected routes. Preserve unrelated systems.
5. Run focused boundary/transit/visual checks below. Iterate only on directly exposed defects. Use one lead, current Sol High; no extra agent swarm, whole-history search, broad research binge, paid tools or model escalation.
6. Push reviewed checkpoints to the existing safe recovery branch, verify remote refs, and update recovery notes. Reuse the asset manifest; upload/verify only new or changed required bytes. No repeated 1.45 GB download and no force push.
7. After necessary release gates, deliver **one new protected non-production preview**, leaving M7 and production unchanged. This is a new candidate, not an overwrite of the reviewed one.

Save this addendum in the existing convergence handoff, with a short pointer from `CONTINUE_HERE.md` and `ASTRA_TAKEOVER_STATE.md`. Append requirement IDs `HALO-SCALE`, `HALO-ACCESS`, `HALO-TRANSIT`, `HALO-QUALITY`, `ROAD-GRADIENT`, `HALO-RELEASE` to the existing ledger, recording implemented/checked/blocked separately. Do not create a parallel master or claim all prior owner choices are now resolved.

The recovery repository is public: preserve the existing source/privacy exclusions, skip unintended deploy triggers and never upload secrets, passwords, private review footage or unapproved third-party/reference material. Do not change repository visibility. Keep separate MAHFITT and Character/S08 jobs untouched.

Save useful checkpoints before long operations; there is no supplied verified remaining-credit balance. Do not promise a fixed usage percentage or completion before credits run out. Cost control comes from avoiding repeated discovery, duplicative implementations and broad tests after every visual adjustment—not omitting the essential new collision checks.

## 9. Small but necessary acceptance set

Reuse existing tests and preview tools. This is targeted work, not a demand for another unrelated full-world investigation. Run any existing mandatory release/security gates once at candidate closure, not on every edit.

Required checks with concrete evidence:
1. Published dimensions match the absolute targets, and reloading/rebuilding does not multiply them again. Visual mesh, host boundary, floor supports, NPC and docks agree.
2. The tower is visibly taller and the actual dome/usable realm is approximately 18× wider, not merely a changed camera FOV or a larger decorative floor under the old 8.2 m dome.
3. Two complete normal-input UP → explore/guide → DOWN trips, including one at zero MAHGIC; no falling, drift, passenger/gear detachment, wrong prompts or ground snapping.
4. Inside: hold flight against the side, roof and curved rim; attempt fast diagonal movement, dropping toward the floor/skirt, alternate form and click-to-move outside. No player-body escape or stuck oscillation.
5. Outside: test shell contact at reachable legal positions and, in an isolated test fixture only, from several shell heights including above and below. Admission is denied independently of the outdoor flight ceiling. Do not enable that fixture or bypass in the shipped build.
6. Ground players walking/flying under the broad elevated deck do not inherit its 240 m support or trigger HALO interactions. Inside equipment/projectiles do not damage or target through the shell.
7. Reload/reconnect during a ride and from inside HALO recovers to a valid authorized state without altering progress or creating an ordinary exit shortcut. Return elevator remains usable.
8. Inside/outside glass, supports, gradients and fixtures remain legible on desktop and a phone-sized tier; no ground-junction regression, cloud slicing, disappearing dome, primitive curved silhouette or materially worse responsiveness in the comparable local route.
9. Targeted gold-to-pink and two other real route-boundary views show the intended smooth connected transition and intact navigation.

Do not equate a protected URL returning 401 with authenticated gameplay success. Use existing authorized credentials for hosted loading when available; never print/request secrets in chat. If unavailable, label that hosted-auth check not run and keep protection intact. Real-phone acceptance remains the owner's.

## 10. Final deliverable and stop condition

Return:
- One new protected preview URL and visible build label.
- Recorded baseline and actual new deck height, shell diameter, shell apex, usable realm extent and lift duration.
- Elevator-only boundary results and short normal-input transit evidence.
- A small set of inspected before/after views showing scale, close material quality and road-gradient continuity.
- Comparable resource/frame observations with device/emulation stated, not invented guarantees.
- Exact changed files and verified GitHub recovery commit.
- Any explicit limitation or blocker, including unavailable authenticated hosting proof.

Keep the reviewed M7 candidate and production unchanged. Do not silently begin another expansion after delivering the candidate. The next step is owner review of the enlarged, enclosed HALO and improved road transitions.

## References / evidence provenance

**Source inspection is real; game implementation is not claimed in this addendum.** The following were read at the pinned M7 revision. Current local state may be newer and must be preserved.

[P1] M7 tree geometry and literal dimensions/cap:
https://github.com/jackedjah/Junctional-/blob/fe1a35b46c4995df8f149bfef4376d16a31833f5/CLAUDE_GAMEPLAY_RUNTIME/26_LOCAL_AUTHORITY/lab/cityScene.js

[P2] M7 execution ledger (scale, transport, preserved systems and acceptance limits):
https://github.com/jackedjah/Junctional-/blob/fe1a35b46c4995df8f149bfef4376d16a31833f5/CLAUDE_GAMEPLAY_RUNTIME/25_HANDOFF/CONVERGENCE/M7_EXECUTION_LEDGER.md

[P3] Scoped M7 implementation changes, including host TRANSIT, guide altitude, render consumption and build metadata:
https://github.com/jackedjah/Junctional-/commit/861cc1bbbf4915e542cf98d2d545564a37a8af0f

[R1] Three.js color-space roles and interpolation. Match the installed renderer; no engine upgrade is authorized:
https://threejs.org/manual/pages/color-management.html

[R2] Three.js InstancedMesh resource sharing, transforms and bounds:
https://threejs.org/docs/pages/InstancedMesh.html

[R3] Three.js transparency behavior and sorting considerations:
https://threejs.org/manual/pages/transparency.html

**BEGIN:** preserve the accepted M7 world, record scale once, implement the larger sealed HALO with elevator-only transit, extend the accepted road gradients, verify the changed systems, back up, and deliver one new protected candidate.

