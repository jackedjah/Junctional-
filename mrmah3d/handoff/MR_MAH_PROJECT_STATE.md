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

R232 RECONSTRUCTION + KNEE SLOPE (this repository)

ACCEPTED BASE: R223-knee-recovery-3dd94ff46ba8, reconstructed into the one
renderer at mrmah3d/core/character/. All 21 retained sources installed; the
shared files are his (they are the later base - proportions.js is hers plus 248
appended lines with no edits) with Mrs. Mah's variant-gated work re-applied on
top. Mounted as createMrMah({authoringMaster:true}); the scene entry threads
that flag so hosts get his accepted sculpt, not the stock pipeline. Builds
headless at 171,265 triangles across 36 meshes. Proof set:
validation/mrmah3d/R232-reconstruction/male__{material,clay}__*.png, nine views
each, captured through mrmah3d/review/.

VERIFIED AGAINST EVIDENCE: the clay front and lower-front match
reference/handoff/CURRENT_STATE_01 and _05 in every respect that identifies the
character - cranial crown, diamond head and face plate, pec shelves with the
sternum valley, three abdominal pairs, obliques, deltoid head separation,
biceps / triceps / brachialis / forearm masses, one fused teardrop to one point,
belt pinch, quad bloom, medial seam. His pose differs (the retained evidence was
captured with both arms lowered; the canonical rest presents the crystal), which
is presentation, not sculpt.

THE OWNER OF HIS LOWER-BODY OUTLINE, ESTABLISHED BY MEASUREMENT. This is what
the R226-R231 plateau needed. `maleTorsoSections` (myofascial.js) rebuilds every
male ring as `{w: .2, d: .2, shape: undefined}` - a uniform cylinder - and
discards the ring table's shape functions entirely. His whole silhouette is then
produced by `torsoSurface` out of three tables in MRMAH_MORPHOLOGY: LOWER_WIDTH,
LOWER_FRONT and LOWER_BACK, through `lowerField`. The ring table below y 1.45 in
proportions.js is read by the female variant and, in part, by Mrs. Mah; for HIM
it is documentation.

A pass was spent on that table before this was checked, and the error is
recorded because the loop is supposed to catch it and did. The ring arithmetic
was right about the table - the y 0.870 row is authored as an 8.7% pinch and
evaluates 5.2% WIDER, because thighShape's vastus-lateralis sweep peaks at the
side angle while the row below it has no lateral term - and it changed nothing
in the character. Two captures at identical framing came back BIT-IDENTICAL and
the built envelope did not move by a ten-thousandth. The trial was reverted; the
diagnosis is now a comment on those rows so the next pass does not repeat it.

WHY R226-R230 PLATEAUED: measured off the built mesh, all three lower profiles
ran strictly monotonically from the point to the hip - 0.145, 0.177, 0.208,
0.247, 0.283, 0.306, 0.318 in width, and the same in depth. A plain convex cone
with no knee and no calf in it. Every one of those trials was a local surface
deformation laid on that cone. No recess cut into a cone makes a knee.

CHANGE MADE: the knee as a change of SLOPE in LOWER_WIDTH / LOWER_FRONT /
LOWER_BACK, which is the smallest correct owner. Not a bulb: the R106 plate's
literal knee-and-calf is the shape R109 tested and the director rejected as "a
thigh bulb over a calf bulb", and its verdict - ONE convergence with a swell on
it - is respected. The run stays monotonic; the slope carries the landmark.

RESULT, MEASURED ON THE BUILT MESH (widest |x| within +-0.02, before -> after):

    y 0.66   0.1453 -> 0.1507    the calf's excess over the straight line
    y 0.77   0.1767 -> 0.1751
    y 0.87   0.2076 -> 0.1971    the knee, 5.1% narrower
    y 0.97   0.2474 -> 0.2414
    y 1.06   0.2830 -> 0.2824
    y 1.13   0.3057 -> 0.3059    quad apex, unchanged
    y 1.22   0.3180 -> 0.3180    hip, unchanged

Contour slope through the knee band fell from 0.285/0.309 to 0.222/0.220 while
the quad's descent rose from 0.398 to 0.443: the break at the knee went from
1.35x to 2.0x. Depth at the knee fell 9.5% (0.1625 -> 0.1471), which is the step
R102 measured on the reference (0.092 against a 0.101 calf) and is where the
knee reads before it reads in width. 376/376 static contracts pass.

MASTERED / LOCKED, UNCHANGED THIS PASS: head/face/crown, arms/hands, torso, quad
apex and hip (0.318 at y 1.22, exact), belt, posterior structure, material
sources, fused tip, and every knee recess and insertion valley - the change is
in three width/depth profiles and touches no channel, cavity or class table.

NEXT ACTION: judge the new break on the lower-front and lower-3/4 clay at
identical framing (validation/mrmah3d/R232-knee/before vs after, tier low and
isolated so no bloom halo thickens the outline). If it reads, the same
measurement applies to the medial return: `lowerField`'s `rail` profile
[[.56,.028],[.80,.103],[1.10,.237],[1.29,.228],[1.46,.154]] is the front seam's
owner and it, too, runs smoothly through the knee band.

ANTI-REGRESSION: never judge a lower-body correction from the ring table - for
him it is not connected to the mesh. Measure the built envelope
(tools/mrmah3d-profile.mjs, or a windowed envelope over the built torso) before
and after. Do not restore a literal plate knee-and-calf: R109 tested it and the
director rejected it.


---

R233 / FINAL PRECISION CLOSURE — PASS A

FROZEN CHECKPOINT: git tag `mr-mah-R232-frozen` at f8388da, taken before any
Pass A edit.

A1 EYES — BLOCKED, NOT ATTEMPTED. The master (§7) says restore the accepted
R168/R169 eye/face runtime and explicitly forbids inventing a replacement. That
runtime is NOT in this repository or in either retained handoff: the only
R168/R169 strings here are the male ARM branch's own revision counter in
arm-master.js and crystal-atlas.js, and Mrs. Mah's MASTER.md names "Character
Creator/R168/R169" as a separate project it is scoped out of. His current eyes
are plain emissive torus rings in head.js (TorusGeometry, tube 0.09 of the eye
radius) with no iris ring, no lid, no expression parameters — which is the
"plain empty ring" §7 rules out. The signature-face sheet in the closure pack
is art direction, not a runtime. A1 needs the R168/R169 source supplied.

CONDITIONING GATE (§3), SCORED ON THE FROZEN BUILD at identical lighting,
isolated clay, low tier (validation/mrmah3d/R233-A-baseline/):

  region              belly  insertion  valley  conditioning
  chest                 ***      ***      ***      elite
  deltoid               ***      **       **       elite
  biceps / triceps      ***      ***      ***      elite
  forearm               ***      ***      ***      elite
  abs / oblique         ***      ***      ***      elite
  upper quad            *        -        -        soft
  medial quad           *        *        *        soft
  knee transition       -        *        *        soft
  calf                  -        -        -        soft
  posterior hamstring   -        -        -        soft

The gate FAILS exactly as the master states. Every lower region reads three or
more categories under the arms.

OWNERS LOCATED. The anterior quad is `lowerField` (myofascial.js), reached
through `torsoSurface`; the ring table is not connected to him. Measured on the
relief profile, the baseline anterior quad is ONE tent (`plate`, peak 0.0595 at
x 0.10-0.13) plus the rail bevel at x 0.21-0.23, separated by a 3-7% dip.

AND `LOWER_PATHS` ALREADY AUTHORS `rectusFemoris`, `vastusLateralis` AND
`hamstring` IN THE RETAINED SOURCE, AND `lowerField` READS NONE OF THEM. Three
of the five owners §4 names exist and are simply not connected.

A2 — TWO METHODS SOLVED NUMERICALLY AND REJECTED BEFORE TOUCHING THE MESH:
  connecting the ribbons on top of the plate widened the single tent and
  dropped valleys to 0-1%;
  cutting the plate to a support sheet so the ribbons carried the projection
  ballooned peak relief 62 -> 78-102, the size increase §1 forbids.
What the arm actually does is SEPARATE, not add — `maleUpperShape` carries
`septa`, a biceps `tendon` and deltoid `grooves`, all negative, and the quad
had one central groove and nothing else.

A2 KEPT (latent): one subtractive `insertionSeam` at the RF/VL boundary,
placed at the midpoint of those two authored centrelines so the anatomy tables
decide where the insertion falls. 0.011 units = 3.9% of the local half-width,
inside the §6 band. It produces a true local minimum on the mesh's own
vertices at y 1.06 (55.8, 53.2, 15.7, 21.6 — a valley where the baseline slid
monotonically) at a cost of 0.7% of peak relief.

IT DOES NOT YET READ, AND THAT IS THE REAL FINDING OF THIS PASS. Rendered at
identical framing, close on the region, it moved 5% of pixels but only 0.03%
of them by four luma or more. Measured angular vertex spacing:

    lower body, y 1.06     32 sides on a 0.285 half-width     0.0560
    upper arm              24 sides on a 0.160 radius         0.0419
    chest                  48-64 sides                        denser

THE ARM SAMPLES ITS OWN SURFACE A THIRD MORE FINELY THAN THE QUAD, ON A MASS A
THIRD THE SIZE. An insertion valley is about 0.03 wide, so two adjacent quad
vertices both take nearly the same displacement, the GRADIENT barely changes,
and shading reads gradient. That is the mechanical cause of the whole §1
conditioning mismatch, and the line that sets it carries the note "R120: move
32 samples from the plain terminal stock to the upper torso; fixed triangle
budget" — the trade is documented and traceable.

A2b — RESOLUTION RAISE: TRIED AND REVERTED. Raising the quad band (y 0.52-1.48)
from 32 to 48 sides costs +3,134 triangles (+1.8%, not a mobile question) and
transformed the read: the same close-up went from 0.03% to 47.6% of pixels
changed by four luma or more, with real belly structure appearing. It is
reverted because it FAILS the §16 gate: it introduces hard bright triangular
wedges and knife-edged seams, which §2 rejects by name.

The cause is measured, not guessed. `torsoMoldNormal` takes a finite difference
of `torsoSurface` with e = 0.002 rad, while the vertex spacing is 0.196 (32
sides) or 0.131 (48) — a step 65 to 98 times finer than the gap it has to
describe. Every vertex therefore gets the ANALYTIC surface's normal while the
triangle between them is a flat chord, and where the surface turns hard the
per-vertex normals disagree with their own facet. Raising resolution made the
surface turn harder, so it made the mismatch visible.

NEXT ACTION (A2c, precisely specified): match the normal's differencing step to
the vertex spacing before raising resolution. `torsoMoldNormal(a,s)` cannot see
the ring's side count today; forge's loft knows it (`ringSides`) and would have
to stamp it on the section. That change touches the chest and back normals too,
which are mastered, so it is its own bounded delta with its own proof — NOT to
be stacked on the resolution raise. Order: fix the step, prove the upper body is
unchanged, then re-apply the 48-side quad band, then the seam reads and A3-A5
(medial/adductor, knee, calf) become possible at all.

ANTI-REGRESSION: do not raise lower-body resolution while the normal step is
0.002 — the result is knife-edged seams. Do not tune `lowerField` amplitudes to
chase a read the sampling cannot carry; the field is already correct.
