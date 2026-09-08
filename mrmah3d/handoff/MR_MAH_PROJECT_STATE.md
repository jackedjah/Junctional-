# MR. MAH — CURRENT STATE

ACCEPTED BASE: R223-knee-recovery-3dd94ff46ba8 installed. Exact historical R203 body.js recovered under current PAL direction;20 other sources exact R206. All21 installed hashes verified. No whole-body best-checkpoint claim yet.

ACTIVE REGION: Upper anterior/medial quad construction. Knee recovery validated; preserve its recesses.

MASTERED / LOCKED: Preserve head/face/hair, arms/hands, torso, upper-thigh envelope, posterior structure, material sources and fused tip during recovery. These are scope locks, not a claim of complete visual mastery.

REGRESSED / NEEDS RECOVERY: R206 knee softening recovered in R223. Current tracked sources are EQUAL to accepted R203 across all21 hashes. Fresh installed front/3Q/side and full facet proof visually confirm recovery. No claim that R203 is best across all historical regions; that broader comparison remains incomplete.

CURRENT DEFECT: Upper quad remains a broad planar panel with an abrupt medial/crown handoff. Recovered knee has a sharp angle requiring anatomical refinement without filling its recess. Recovery holds; no smoothing permitted as a substitute for belly definition.

REFERENCE: outputs/R206/retained-comparison/isolated-lower-threequarter.png (R203); outputs/R221/installed-current/isolated-lower-threequarter.png (R206). Same framing, neutral clay.

LATEST EVIDENCE: outputs/R224/installed-recovery contains fresh installed local front/3Q/side and full faceted3Q,172510 runtime triangles,no browser errors. All21 sources match accepted R203 and retained R223. R223 is installed, not pending. Local preview server restarted after ERR_CONNECTION_REFUSED; execution now works.

NEXT ACTION: Upper-quad trial sequence is at a plateau. Do not repeat rejected variants or extend remeshing diagnostics into a renderer refactor. Resume geometry only with a concrete reference-supported medial-return target and a predicted front/3Q improvement. Preserve R223 meanwhile. See outputs/R230/HANDOFF.md.

HISTORICAL REGIONAL CHECK (R225): Viewed outputs/R164/quad-and-knee-comparison.jpg and outputs/R163/actual-quad-returns.jpg. R162/R163 lack current knee and medial carving; R164 adds it. Current is BETTER in retained separation than R162/R163, with inherited R164 panel defect unresolved. No evidence supports rolling back this region. R223 all21 hashes reverified. No geometry change this check.

ANTI-REGRESSION NOTE: Do not fill knee/insertion recesses to eliminate an angular transition. R203's sharper fold still needs anatomical review; recovery is not completion. Upper-quad and hair gaps remain open. Never promote R207–R222 rejected candidates.

R226 TRIAL: REJECTED bounded +.004Z upper-quad belly. Twelve raw triangles changed; bounds/protected geometry/winding passed, browser errors empty. Front/3Q/side inspected: small angular bulge without resolving panel/medial handoff. No canonical edit or new accepted checkpoint. R223 remains retained. Evidence outputs/R226/belly-A; checks outputs/R226/checks/knee-cage.json.


R227 TRIAL: REJECTED upper-strip four-plane return fan at retained crown support. Front/3Q clay still show panel and abrupt medial edge. Twelve raw triangles changed;3918 protected triangles/attributes exact including knee/calf/tip; bounds and winding pass. No browser errors. No canonical writes. R223 all21 hashes verified and retained. Evidence outputs/R227/ridge-A; checks outputs/R227/checks/knee-cage.json. Current EQUAL to accepted R203; not declared complete.


R228 DIAGNOSIS: Retained all21 hashes match. Current boundary audit saved outputs/R228/checks/boundaries.json: transverse turn12.35 degrees versus medial51.19 degrees. Trial omitting only transverse constraint index1 failed protected aSmooth equality; rejected before render. No canonical change, R223 retained. No new visual improvement claimed.


R229 AUDIT: Exact-position no-op (10 samples, no paths) retriangulates20 ordered faces and changes57 aSmooth/aMoldNormal components on matching triangles, max .263767. No matching triangles wholly below Y1.13 changed. This invalidates treating remeshing as neutral. Saved outputs/R229/checks/noop.json. No new render or canonical edit; R223 remains accepted and incomplete.


R230 RETAINED REVIEW: All21 hashes match R223; existing R224 full faceted3Q re-inspected. Current EQUAL to accepted retained state, not complete. No new accepted anatomy or renders. Current quad methods exhausted; stop speculative variants rather than report repeated audits as progress. R229 normal changes do not alone establish a renderer bug. Canonical source untouched.

LATEST CONTINUATION CHECK: Master/state read; all21 canonical source hashes still match R223. No new evidence or supported anatomical target supersedes the R230 plateau decision. No edits or renders performed. Next meaningful work remains defining a reference-supported medial return, not repeating rejected trials. This is an unchanged-state check, not a new checkpoint or improvement.


CURRENT VISUAL STATUS — R231: Nine clean installed CURRENT_STATE renders saved outputs/R231/FINAL_CURRENT_STATE. EQUAL to R223/R203; all21 hashes match and hero PNG exactly equals R224 proof. No new visible regression identified. Preserved identity, broad shoulders, chest/abs, arm mass, fusion and facet presence are not blanket mastery. Unresolved: panel-like quads, abrupt medial return, weak calf projection and knee/calf rhythm; coarse torso/rounded arm transitions and unfinished hair. Largest blocker is muscle-driven lower-body structure, particularly side/back, not missing surface detail. No justified surgical correction established; stopped after proof. Full assessment in outputs/R231/FINAL_CURRENT_STATE/README.md. Exact next action remains defining a bounded anatomical return target with knee/valley protection; no repeated rejected variants.



---

R232 RECONSTRUCTION + KNEE SILHOUETTE (this repository)

ACCEPTED BASE: R223-knee-recovery-3dd94ff46ba8, reconstructed into the one
renderer at mrmah3d/core/character/. All 21 retained sources installed; the
shared files are his (they are the later base — proportions.js is hers plus 248
appended lines with no edits) with Mrs. Mah's variant-gated work re-applied on
top. Mounted as createMrMah({authoringMaster:true}); the scene entry threads
that flag so hosts get his accepted sculpt, not the stock pipeline. Builds
headless at 171,265 triangles across 36 meshes. Proof set:
validation/mrmah3d/R232-reconstruction/male__{material,clay}__*.png, nine views
each, captured through mrmah3d/review/.

VERIFIED AGAINST EVIDENCE: the clay front and lower-front match
reference/handoff/CURRENT_STATE_01 and _05 in every respect that identifies the
character — cranial crown, diamond head and face plate, pec shelves with the
sternum valley, three abdominal pairs, obliques, deltoid head separation,
biceps / triceps / brachialis / forearm masses, one fused teardrop to one point,
belt pinch, quad bloom, medial seam. His pose differs (the retained evidence was
captured with both arms lowered; the canonical rest presents the crystal), which
is presentation, not sculpt.

ACTIVE REGION: the knee within the fused teardrop. RESOLVED THIS PASS — see
below. The medial return is next.

CURRENT DEFECT, RE-DIAGNOSED BY MEASUREMENT: the lower body had NO KNEE IN ITS
SILHOUETTE. Measured off the built outline with tools/mrmah3d-profile.mjs, and
confirmed analytically against the ring table, the half-width ran strictly
monotonically from the point to the hip: 0.189, 0.208, 0.219, 0.252, 0.291,
0.333, 0.364. The y 0.870 row was AUTHORED as an 8.7% pinch (w 0.190 under the
0.208 below it) and came out 5.2% WIDER. The cause is the rule this package
already carries and had not applied here: a ring's `w` is not its silhouette.
`thighShape`'s vastus-lateralis sweep, `domePair(a, 1.42, 0.55)`, peaks
essentially AT the side angle, so a 0.16 sweep multiplied that ring by 1.152
while the ring below it — `lowerLegShape`, which has no term reaching the side —
multiplied by exactly 1.000. The pinch was not weakened; its sign was reversed.

WHY THE R226-R230 TRIALS PLATEAUED: every one of them was a local surface
deformation — a bounded belly, a four-plane return fan, a shared-coordinate
compression, a taper-owner plane study — applied to an outline that is a plain
cone from the hip to the point. No recess cut into a cone makes a knee. This is
the "change the LOCAL method/owner" the handoff asks for: the owner of a
silhouette event is the ring table, not a surface sculpt on top of it.

CHANGE MADE: two numbers, both the vastus lateralis fading into its insertion as
the anatomy requires. y 0.950 vl 0.22 -> 0.12, y 0.870 vl 0.16 -> 0.03. Every
`w`, `d`, class table, cavity, facet group, zone and recess channel on those
rows is untouched, so the recovered R223 knee carving is intact and no
insertion valley is filled.

RESULT, MEASURED ON THE OUTLINE (hip downward): 0.291, 0.234, 0.195, 0.208,
0.189. A knee at 0.195 — within 2% of the R106 godform plate's 0.192 — with the
calf standing 6.6% proud of it against the plate's 5.5%. One convergence with a
swell on it, which is what R109 judged worth more than two matched widths, and
not the thigh-bulb-over-calf-bulb it rejected. 376/376 static contracts pass.

MASTERED / LOCKED, UNCHANGED THIS PASS: head/face/crown, arms/hands, torso,
upper-thigh envelope and hip apex (0.364 at y 1.230), posterior structure,
material sources, fused tip.

NEXT ACTION: the medial return, measured the same way. The seam channel
(`thighShape`'s `dome(a, 0, 0.30) * seam`) runs 0.34, 0.34, 0.22 down the thigh
and then STOPS DEAD at y 0.870 — the rows below use `lowerLegShape`, which has
no seam term at all. That discontinuity, not a local bump, is the "abrupt
medial/crown handoff" the state file has been describing. Verify it on the
lower-front clay before editing, and fade the channel across the grammar change
rather than adding a return.

ANTI-REGRESSION: never restore the vl sweep on the two knee rows without
re-authoring their `w` — the sweep is what cancelled the pinch. Never judge a
lower-body correction from the ring table; measure the outline. Do not fill the
knee recesses to soften the new concavity.
