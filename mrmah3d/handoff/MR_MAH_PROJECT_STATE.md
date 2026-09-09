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


---

R233 / A2c — WEDGE RECOVERY: THE CROWN IS A C1 DOME

A1 EYES — BLOCKED, WAITING FOR R168/R169 EYE SOURCE. Not failed, not
attempted. The R168 pack supplied (mrmah3d/handoff/r168-eyes/) contains the
runtime SPEC, the data contract, the preset seed, the acceptance checklist and
the reference boards — and ZERO source files. §7 forbids inventing a
replacement, so this stays blocked until the runtime is supplied. His eyes
remain plain emissive torus rings with no iris ring, lid or expression
parameters. Anatomy closure is not waiting on it.

RECOVERY STATUS: the hard triangular wedges were never in a committed build.
They came from the A2b 48-side resolution trial, which was reverted before the
Pass A commit; HEAD carried only the latent narrow seam. Verified at 02cda04:
`sidesAt` is the retained rule, working tree clean.

THE DISCONTINUITY (step 4), FOUND AND MEASURED. It is not resolution. The
anterior quad's dominant term — its whole mass — was PIECEWISE LINEAR:

    face = .044 - outerSlope*max(0, q-crest) - innerSlope*max(0, crest-q)

clamped by max(0, face). Its derivative jumps from +0.018 to -0.080 across the
crest, a 5.4x CORNER, and the clamp adds a second. A first-derivative
discontinuity is invisible while it falls between samples and renders as a hard
crease the moment a vertex lands on it. Subdivision did not create the wedges;
it revealed a crease already authored into the field. That is why more
triangles is not the fix and why the 48-side trial had to be reverted.

Supporting measurement, kept for the record: six of the eight terms in
`lowerField`'s anterior return are authored BELOW the mesh's Nyquist limit —
anterior vertex spacing at y 1.06 is 0.0560 and the central groove (0.022), the
two bevel terms (0.023 / 0.025), the vastus-medialis ribbon (0.034) and the
rectus-femoris path (0.052) are all narrower. Below Nyquist a feature either
vanishes (the flat plate at 32 sides) or lands on one vertex and spikes (the
wedges at 48). The field is authored at a spatial frequency the topology cannot
represent.

THE ONE BROAD SMOOTH-FALLOFF CORRECTION (step 5). The tent became a smoothstep
DOME with the same crest position, the same peak and the same footprint — only
the manner of falloff changes. Zero derivative at the crest and at both ends,
so there is no corner anywhere for a vertex to find. No subdivision, no
sharpened seam, no added triangles.

MEASURED AT THE MESH'S OWN VERTEX POSITIONS:

                                   frozen tent   narrow seam   A2c dome
    worst first-derivative jump       0.332         0.331       0.025
    max sample-rate curvature         53.4          56.5        44.7
    peak relief                       57.5          56.5        57.6

13x smoother across the crest, 16% less curvature at the sample rate, and the
mass is unchanged. Zero slope at the crest is also the anatomically right
shape — this package's own rule is that a belly is a plateau with steep flanks,
not a cone — so the quad reads fuller at identical volume.

ALSO REVERTED: the A2 narrow insertion seam, helper and call. It RAISED
sample-rate curvature (53.4 -> 56.5) while delivering nothing visible (0.03% of
pixels by four luma), which makes it a per-vertex spike rather than an
insertion. Its finding is kept here; the geometry is gone.

KEEP GATE — ALL SIX PASS:
    ridges disappear            yes (visual; derivative jump 0.332 -> 0.025)
    quad belly more readable    yes (dome crown, fuller crest at equal mass)
    insertion still visible     yes (the central seam is untouched)
    fleshy, not mechanical      yes (C1 everywhere in the crown)
    no puffiness                yes (peak +0.2%)
    fused silhouette intact     yes (outer contour change 0.00000 units, exact)

376/376 static contracts pass. Proof:
validation/mrmah3d/R233-A2c/male__clay-iso__{05-lower-front,
06-lower-threequarter,03-side,10-quad-front,11-quad-threequarter}.png,
isolated clay, low tier, identical framing to R233-A-baseline.

REMAINING, AND NOT A2c's BUSINESS: the faint rectangular soft patches mid-thigh
are the `fg` flat-shaded facet groups — the crystal layer. Pass 2, not anatomy.

NEXT: A3, the medial/adductor to knee transition. Same discipline — prove the
built-mesh owner, measure the contour and the vertex spacing, one bounded
change, neutral clay proof. Note before starting: the same corner test should
be run on every remaining lower-body term, because `Math.max(0, ...)` and
piecewise-linear falloff appear elsewhere in `lowerField` and in `thighShape`.

ANTI-REGRESSION: never author a lower-body term with a first-derivative
discontinuity — it is invisible until a vertex lands on it and then it is a
wedge. Never raise lower-body resolution as a fix for a soft read; it sharpens
creases before it adds form. Do not re-add a sub-Nyquist insertion seam.


---

R234 / A2 RIDGE RECOVERY — THE ANTERIOR FIELD IS LOW-FREQUENCY

BASE: A2c (ef02bb7), the last clean checkpoint. No wedge-producing change has
ever been committed; the 48-side trial was reverted before Pass A landed.

STEP 1, OWNER: `lowerField`'s anterior return (myofascial.js), reached through
`torsoSurface`. Unchanged from A2c.

STEP 2, SPACING: eight anterior samples across the half-width — x 0, .012,
.036, .084, .120, .180, .228, .264 at y 1.06. Gaps 0.012 to 0.060. Ring
spacing in y 0.03 to 0.11.

STEP 3, THE DISCONTINUITY — AND IT IS NOT A NORMAL BREAK. Measured on the
built torso, `aSmooth` (which the clay gate reads) is PERFECTLY CONTINUOUS:
0 splits across welded duplicate corners in both the lower body and the chest,
worst disagreement 0.0 degrees. So the faceted-staircase read is normal CHANGE
ACROSS ONE TRIANGLE, not a crack between two. With eight samples over the
half-width a single face spans a large arc, and linear interpolation of a
fast-turning normal across it renders as a triangular band.

Measured worst turn between adjacent anterior faces, isolating each term:

    as it stood (A2c)                  57 deg
    vastus-medialis ribbon widened     45-47 deg    <- dominant by far
    bevel widened                      51 deg
    central channel widened            56 deg       <- negligible

STEP 4, BASELINE: worst adjacent-face turn 57 deg; peak relief 57.6; centre
insertion 118/120/121/128% of the crown at y 0.95/1.06/1.18/1.30; outer
contour as frozen.

STEP 5, ONE BOUNDED FAMILY: the anterior relief's SPATIAL FREQUENCY. Widths up,
depths held — VM ribbon 2.2x (through a new `ribbonFieldWide`, so the authored
track is untouched and only its feathering changes), bevel 2x, central channel
0.022 -> 0.050. No subdivision, no sharpened seam, no new term.

RESULT:
    worst adjacent-face turn   57 -> 44 deg   (-23%)
    peak relief                57.6 -> 58.6   (+1.7%, marginally FULLER)
    centre insertion           104/110/117/132%  (still reads)
    outer contour              0.00000 units change, exact
    376/376 static contracts pass

KEEP GATE:
    ridges disappear          IN THE QUAD, yes. In the KNEE band, no - see below
    belly reads more human    yes (smoother, fuller, no flattening)
    insertion still visible    yes
    conditioning closer         partly - smoother, still less separated than arms
    no puffiness               yes (+1.7% peak, contour exact)
    fused silhouette holds     yes (exact)

KEPT, because it improves what it owns and regresses nothing measurable.

HONEST REMAINDER: angular chevron shapes persist in the KNEE band, roughly
y 0.58-0.95. They are outside this pass's variable family — that band is owned
by `kneeAccent` (a Gaussian 0.065 in y by 0.20 in q) and the taper's facet
groups, neither of which this pass touched. They are A4's region and the same
per-face-turn measurement applies to them.

Proof: validation/mrmah3d/R234-A2-ridge/male__clay-iso__{05-lower-front,
06-lower-threequarter,03-side,11-quad-threequarter}.png — isolated clay, low
tier, identical framing to the frozen baseline.

ANTI-REGRESSION, ADDED: the clay gate's normal is provably continuous, so a
"faceted" read in clay is never a normal bug — measure the per-face TURN
instead. Do not widen a term without checking the peak: widths up at constant
depth make a belly fuller, not flatter, and the reverse loses mass.

NEXT: A4, the knee band, same method. Do NOT start crystallization; the anatomy
mesh must read smooth first and the facet layer is a separate later concern.


---

R235 / A3 — THE KNEE-BAND WEDGES WERE AN EDGE SPLIT

BASE: R234 (0682f6e), the accepted checkpoint carrying the broad-field /
VM-ribbon smoothing. That quad field is LOCKED and was not touched.

METHOD NOTE — the curvature law was applied as a DIAGNOSTIC, not a target. No
angle was optimised toward a number. Outliers were flagged only where a turn was
both substantially sharper than its own immediate neighbours AND unsupported by
the accepted reference.

REFERENCE FIRST. Two sheets govern this region.
`reference/handoff/MAHWORLD_Teardrop_Anatomy_Reference_Sheet.png` — Mr. Mah's
lower-body notes read "QUADS FEED DIRECTLY INTO TEARDROP / ADDUCTORS BLEND INTO
CENTER LINE / HAMSTRINGS WRAP TO REAR / CALVES MERGE CLEANLY INTO POINT /
CRYSTAL PLANES FOLLOW MUSCLE BELLY / NO DISCONNECTED SURFACE", and its muscle
map runs LONGITUDINAL columns converging on the point.
The Crystal Anatomy Blueprint carries a close-up literally titled "KNEE ACCENT
(BOTH)" — so a knee accent IS reference-supported, but it is shown as a gentle
narrowing with the columns running THROUGH it, never a transverse fold.

THE CLAY TEST SETTLES OWNERSHIP. `maleTorsoSections` zeroes crystal, crystalY,
facet, cav and fg on the male torso, so his lower body carries NO crystal layer
at all. Anything visible in a neutral-clay render there is macro anatomy by
construction — it cannot be intentional crystallization.

MEASURED, on real triangles of the built mesh (adjacent-face normal angles,
anterior only, each outlier reported with its own local neighbourhood):

  BEFORE
    knee band y .58-.95   faces 208   median 6°  p90 33°  p99 90°  max 103°
    worst 103° at y0.832 x+/-0.119   neighbours n=10 median 7° range 1-90°
                                     ratio 14.9x   reference support: NONE
    second 90° at y0.832 x+/-0.095   neighbours n=16 median 6°   ratio 14.9x

  AFTER
    knee band y .58-.95   faces 184   median 5°  p90 29°  p99 55°  max 55°
    worst  55° at y0.673 x+/-0.043   neighbours n=17 median 7° range 0-41°
                                     ratio 8.1x    location: adductor channel
    quad  y .95-1.45      faces 379   median 7°  p90 28°  p99 69°  max 71°  IDENTICAL
    taper y .20-.58       faces  65   median 4°  p90 23°  p99 47°  max 47°  IDENTICAL

THE OWNER, body.js: a `refineRecessEdges` call splitting up to EIGHT existing
edges along a CLOSED DIAMOND loop [[.064,.90],[.129,.79],[.063,.645],[.039,.79]]
in the band y .58-.95. Its right corner is x 0.129 at y 0.79 — exactly where the
outliers sit. Splitting eight edges along a closed contour in a mesh whose faces
are 0.05-0.11 across cannot make a smooth transition: it makes long slivers
whose normals disagree with their neighbours. It had left inserted vertices at
y 0.82, where the ring table has no ring at all — which is what first exposed it.

THE CORRECTION: that one call is REMOVED. Two things justify removal over
tuning. The brief rules out solving this with subdivision, and this call IS
subdivision. And the knee landmark does not depend on it — the recess is
authored by `MRMAH_RECESSES.lower` through `sculptSurfaceRecesses` and by
`lowerField`'s kneeAccent, both untouched; the split only added SAMPLING for
them, and the sampling is what broke. The quad's own split at y .92-1.32 stays.

A REJECTED ATTEMPT, recorded so it is not repeated. The first hypothesis was
that the profile tables' piecewise-linear knots were the corners — `profileAt`
is linear, and the R232 knee pass inserted knots at y .62/.70/.78/.88/.98 whose
slope jumps reach 300-380% in LOWER_FRONT/LOWER_BACK. Fritsch-Carlson monotone
cubic interpolation was implemented for the lower profiles only and measured:
the knee outlier did not move (103° -> 104°). WRONG OWNER; reverted. It did
improve the quad's tail (p99 69° -> 63°, max 71° -> 64°) at no cost, so it is
kept on file as a candidate for a later pass with its own proof — it is NOT in
this build.

VISUAL (isolated neutral clay, low tier, identical framing):
  quad        unchanged — measured bit-identical, 379 faces, same distribution
  knee        wedges GONE. The extreme close-up shows continuous fleshy surface
              with a soft longitudinal centre channel where the diamond cage's
              hard triangles were.
  calf        unchanged, smooth convergence to the point
  silhouette  bit-identical across all 24 comparable bands (0.00000 units)

Proof: validation/mrmah3d/R235-A3/male__clay-iso__{05-lower-front,
06-lower-threequarter,03-side,11-quad-threequarter}.png

REFERENCE PARITY: BETTER. The band now reads as the sheet's continuous
longitudinal flow rather than a transverse cage.

KEEP. 376/376 contracts pass.

HONEST REMAINDER: the knee band still holds outliers at 55°, 47°, 46° and 45°
with local ratios of 8x to 17x. They are smaller and no longer read as hard
wedges in clay, but they are still outliers by the rule. The 55° pair sits on
the central adductor channel at y0.673 — A5's region (mechanical ridge/divot
continuity). Do not chase them before looking.

NEXT: STOP FOR VISUAL REVIEW, per the brief. A4 (knee -> calf) is not started.


R236 / A3b — THE RESIDUAL ADDUCTOR-CHANNEL RIDGE WAS THE KNEE KITE'S OWN
INSERTED VERTICES
---------------------------------------------------------------------------
BRIEF: the A3 proof still showed an angular ridge / faceted staircase through
the central adductor -> knee transition. Work ONLY that discontinuity. Do not
touch quad mass, hip width, outer silhouette, chest, arms, head, global
lower-body width, calf or the crystal layer. One bounded correction that
spreads the directional change across neighbouring samples WITHOUT flattening
the adductor anatomy.

ACTIVE OWNER (measured, not assumed): `quadKneeSurfacePatch` in myofascial.js
passes its `paths` list to `conformSurfacePatch`, which INSERTS A VERTEX for
every landmark. The medial and crown rails run along the limb and land near
existing ring vertices, so they cost nothing. The knee kite does not — it is a
closed quadrilateral plus a centre point, five landmarks per side, dropped into
a band whose natural rings are y 0.55 / 0.66 / 0.77 / 0.87.

Raw triangle probe at y0.673 x0.043 showed the row populations:

  y 0.645 ->  2 vertices   (-0.0630, 0.1122) (0.0630, 0.1122)
  y 0.660 ->  7 vertices
  y 0.770 ->  5 vertices
  y 0.790 ->  4 vertices   (-0.0650) (-0.0390) (0.0390) (0.0650)

y0.645 and y0.790 are not rings. They are QUAD_KNEE_LAYOUT.knee corners
[.063,.645] and [.039,.79] and center [.065,.79], exactly. Connecting a
two-vertex row to a seven-vertex row across a 0.015 gap can only make a fan of
slivers, and one of them — area 2.6e-4, normal [-0.42,-0.70,0.58] — meets its
neighbour [0.10,-0.06,0.99] at the flagged 55 degrees, against local
neighbours at a median of 7.

TWO HYPOTHESES MEASURED AND REFUTED FIRST, recorded so they are not retried:
  - zeroing `kneeAccent` moved the outlier 55 -> 50 only. It contributes about
    a tenth. NOT the owner.
  - Fritsch-Carlson monotone cubic on the lower profiles, re-applied against
    this residual after the R235 sliver was gone: 55 -> 55. NOT the owner, for
    the second time. The piecewise-linear knot is definitively not what makes
    this corner.

THE CORRECTION — one line. The kite loop and its five spokes come out of
`paths`; `medial`, `crown` and the rungs between them stay:

  -  const paths=[medial,crown,...crown.map((p,i)=>[p,medial[i]]),
  -                knee.concat([knee[0]]),...knee.map(p=>[center,p])];
  +  const paths=[medial,crown,...crown.map((p,i)=>[p,medial[i]])];

Only the forced EDGES go. `sample` is untouched and still carries the kite's
displacement, so the knee's authored surface — its depth, its medial rails, its
adductor channel — is applied exactly as before onto whatever vertices exist.
That is what spreads the directional change across the ring neighbours instead
of concentrating it on five inserted points, and it flattens nothing. It is
also not subdivision, which the recovery brief rules out; it is the opposite.

BEFORE / AFTER (ground truth, adjacent-face angles on built triangles,
anterior only):

                            A3        A3b
  knee band y .58-.95 max   55°       47°
  knee band p99             55°       47°
  knee band p90             29°       28°
  outlier at y0.673         present   GONE
  outliers at y0.738 / y0.827  47/46° GONE
  quad y .95-1.45           379 faces, max 71°   IDENTICAL
  taper y .20-.58            65 faces, max 47°   IDENTICAL

WHAT ACTUALLY MOVED (whole-torso vertex-set comparison of the two builds):
EIGHT positions, and nothing else. 12288 vertices, 2050 unique positions in
both; 8 only in A3, 8 only in A3b.

  only in A3   x -0.129 .. 0.129   y rows 0.645, 0.790   (the kite corners)
  only in A3b  x -0.140 .. 0.140   y rows 0.660, 0.770   (the natural rings)

Windowed outer envelope over y 0.55-0.98: every real ring row (0.55, 0.65/0.67,
0.75/0.77, 0.85/0.87, 0.95/0.97) is bit-identical to five decimal places. The
two rows that lose width are the inserted kite corners themselves, interior
points at |x| 0.063 and 0.129 where the outline is 0.151 and 0.197 — they never
reached the silhouette.

VISUAL (isolated neutral clay, identical framing, 4x magnified centre-channel
close-up before and after):
  centre channel  the hard diagonal wedge and the chevron kink at its foot are
                  GONE. It reads as one soft longitudinal groove.
  adductors       still separated — the channel and the two bellies either side
                  remain readable in the front and quad three-quarter.
  below the knee  the taper is continuous; magnified 4x it shows no staircase.
  quad / hip /    unchanged, and proven unchanged at the mesh, not by eye.
  silhouette
  puffiness       none; nothing on the outline moved.

Frame-level diff of the lower-front capture is bounded to x350-522 y374-607 —
the adductor/knee band and nothing else. The three-quarter captures show a thin
scatter of sub-8-luma differences across the whole body; that is the idle
animation's phase, not geometry (the proof tool waits a fixed 420 ms and the
body is breathing), and the vertex comparison above is what settles it.

REFERENCE PARITY: BETTER. The R106 anatomy sheets want belly -> shallow
longitudinal channel -> smooth distal transition -> knee. That is now what the
clay shows.

KEEP. 376/376 contracts pass.

HONEST REMAINDER, unchanged in kind from A3 but smaller: the top outlier in the
band is now 47° at y0.605 x±0.037, whose local neighbourhood (n=27) has a
median of 5° — still a high ratio by the diagnostic. Magnified 4x it is
invisible: the below-knee taper reads smooth. Per the curvature law the angle is
a measurement and the clay is the authority, so it is recorded and NOT chased.
Also still standing from earlier passes and outside this brief: the rectangular
panel visible on the upper quad in both builds (the quad's own y .92-1.32 split
in body.js, pre-existing and identical before and after), and
`torsoMoldNormal`'s differencing step of 0.002 rad against 0.131-0.196 vertex
spacing.

NEXT: STOP FOR VISUAL REVIEW, per the brief. A4 (knee -> calf) is not started.
A1 remains BLOCKED — WAITING FOR R168/R169 EYE SOURCE.


R237 — THE KNEE-KITE EXPERIMENT IS FINISHED, AND IT REVERTS. THE WEDGE AND THE
CREST ARE THE SAME FEATURE.
---------------------------------------------------------------------------
BRIEF: MAH_LOWER_BODY_STEER_R2 (filed at mrmah3d/handoff/lower-body-steer-r2/).
Finish and VALIDATE the knee-kite experiment. Matched before/after clay. Keep
ARTIFACT REPAIR separate from ANATOMY COMPLETION. Mrs. Mah read-only, and a
shared-code change needs proof her output is unchanged. Stage A retention gate:
"retain only if the unwanted wedge decreases WITHOUT reducing the knee
landmark, muscle relief, or accepted neighbouring shape. Otherwise revert only
that experiment." After TWO technically distinct failed trials, freeze and
report the representation constraint rather than continue.

STATUS
  ARTIFACT REPAIR   proposed / tested / REJECTED (both trials)
  ANATOMY PARITY    pending — not improved, not regressed; the sculpt is the
                    accepted A3 checkpoint, bit-identical
  CRYSTAL FINISH    deferred, untouched

WHAT R236 GOT WRONG. The A3b record above claims the deletion "flattens
nothing". It does. The claim was reasoned from the source ("`sample` is
untouched") and never measured, and the gate that would have caught it — the
knee LANDMARK, as opposed to the knee's authoring function — was not in the
brief until R2 added it.

THE MECHANISM, read out of forge.js rather than assumed. A path in
`conformSurfacePatch` does two separable things:
  - each POINT claims the nearest unclaimed interior vertex and MOVES it onto
    the landmark (`q[best]=xy.slice()`, line ~1620). Every interior vertex is
    then displaced by `sample` (line ~1693). So a landmark decides WHERE the
    authored surface is evaluated — it is anatomy, not decoration.
  - each consecutive PAIR registers a constraint edge, recovered by edge flips
    and thereafter excluded from the empty-circle pass that cleans up diagonals
    (`recovered.has(e)`). So a constraint edge aligns triangles with a feature.
`quadKneeSurfacePatch` does NOT set `insertConstraints`, so the kite never
inserted vertices at all — it relocated four existing ones per side. The A3b
note's "inserts a vertex for every landmark" was wrong about the mechanism and
right about the row populations.

TRIAL 1 — A3b, delete the kite from `paths`. (Commit f73ed89, now reverted.)
  knee band max/p99  55 -> 47 degrees; the y0.673/0.738/0.827 outliers gone
  vertex set         8 positions out (y rows 0.645, 0.790), 8 in (0.660, 0.770)
  KNEE LANDMARK      FAILED. Raycast on a fixed world grid (x -0.17..0.17 by
                     0.005, y 0.56..0.99 by 0.01, 3036 samples), peak-to-centre
                     relief in the band:
                        y 0.750   0.0154 -> 0.0128   -17%
                        y 0.800   0.0161 -> 0.0099   -38%
                        y 0.850   0.0185 -> 0.0067   -64%
                     The channel FLOOR is identical at every row (0.1149,
                     0.1238, 0.1323); the PEAK beside it collapsed. The owner
                     is the landmark `[.129,.79]`, the lateral crest of the
                     medial mass: with no vertex there its authored target is
                     never evaluated and the crest is interpolated away.
  clay               the wedge goes AND the band goes soft — the crest's
                     light/dark break is gone. Visible, not marginal.
  VERDICT            REVERT. The wedge decreased by reducing muscle relief,
                     which is exactly what the gate excludes.

TRIAL 2 — A3c, keep all five kite landmarks as SINGLE-POINT paths. A one-point
path claims and moves its vertex identically but registers no pair, so the
anatomy is sampled and the diagonals are free.
  vertex set         BIT-IDENTICAL to A3. 2050 unique positions, zero
                     differences. Only the triangulation of the same points
                     changed.
  knee band max      55 -> 79 degrees. WORSE.
  clay               a stack of rectangular tiles down the channel. A planar
                     Delaunay diagonal is chosen in the (x,y) projection and
                     cuts ACROSS a ridge in z. The constraint edges were doing
                     real work.
  VERDICT            REVERT.

THE REPRESENTATION CONSTRAINT, which is the actual finding. The crest is
carried by ONE relocated vertex per side, sitting 0.015-0.020 from a ring
(kite rows y 0.645 / 0.790 against rings at 0.660 / 0.770). The fan that
stitches that sparse row to a dense ring across that gap IS the sliver, and
the constraint edge that holds the crest IS the 55-degree turn. At this
resolution the two are the same feature: a sampled crest with a 55-degree
turn, or a smooth band with no crest. Not both.

PROPOSED, NOT DONE — both exceed "artifact repair" and move the accepted
sculpt, so they wait for approval:
  (a) move QUAD_KNEE_LAYOUT.knee's rows onto the ring heights (0.645 -> 0.660,
      0.790 -> 0.770) so the crest is carried by a full row and no thin band
      exists. Cost: the knee landmark shifts 0.015-0.020 units, about 1.5% of
      lower-body height.
  (b) give the band a real ring at the crest height in the lower table, so the
      crest is a ring feature rather than a patch landmark. Larger, and it
      touches the accepted lower-body ring structure.
Estimated by the same measurement in both cases; neither is speculative.

MRS. MAH — UNTOUCHED, PROVEN. `myofascial.js` is imported by exactly two files
(`body.js` and `crystal-atlas.js`, which reads QUAD_KNEE_LAYOUT and was not
edited); `limbs.js`, `mrmah.js` and `mrs-mah.js` do not import it, and the
lower-body patch block is inside `if (maleAnatomy && ...)` where
`maleAnatomy = !P || P.name !== 'female'`. That is the argument; the proof is
that her whole body group was built under A3, A3b and A3c and compared mesh by
mesh — 14 meshes, vertex counts, an order-independent AND an order-dependent
position checksum, and both bounding-box corners: IDENTICAL in all three.

CAPTURE METHOD — worth keeping. Every earlier "matched" pair differed across
the WHOLE frame by a few luma, and it was the idle animation: the proof tool
waits a fixed 420 ms and the body breathes. The R237 set is driven from a
browser context created with reducedMotion:'reduce', and the frame diff between
two builds is then bounded to the knee band and nothing else (x357-506,
y378-608 of the lower framing). Use that for any before/after from now on.
Nothing in tools/ was edited; the driver is a scratch script.

Proof: validation/mrmah3d/R237-knee-gate/ — six matched clay views per build
for all three, plus the 5x band crops and a three-up comparison sheet, with a
README recording the capture settings.

NET: the tree is back at the A3 sculpt, bit-identical, 376/376 contracts pass.
The knee-band wedge is STILL PRESENT and is now understood rather than
guessed at. A1 remains BLOCKED — WAITING FOR R168/R169 EYE SOURCE. Stage B
(one anterior-quad organization pass) is NOT started; the steer requires the
user to accept a Stage A result first, and the honest Stage A result is a
revert plus a proposal.


R238 — ANTERIOR-QUAD PROTOTYPE. THE CROWN WAS ON THE INNER HALF OF ITS OWN
SURFACE, AND THE OWNER WAS NOT THE FUNCTION THAT LOOKED LIKE IT.
---------------------------------------------------------------------------
BRIEF: one independent anterior-quad prototype above the unresolved knee band.
Better muscle ORGANIZATION, not more size, more smoothness or another engraved
groove: a full elongated volume with a coherent outer sweep and controlled
inner separation. Keep A3, park the knee repair, Mrs. Mah read-only. One
localized shape experiment; preserve the knee landmarks and triangulation.

BASELINE   28d1f04, working tree clean, verified bit-identical to the A3 sculpt
           (2050 unique vertex positions, zero differences) before any edit.

THE FIRST OWNER WAS THE WRONG ONE, and it was caught by measuring rather than
reading. `lowerField`'s `plate` term is documented here (R233 / A2c) as "the
anterior quad's whole mass", so the first edit moved its crest outboard. Built
and compared: max |dz| 0.0003, i.e. nothing. Reverted.

`torsoSurface` runs TWO more stages after `lowerField` returns:
  - `anatomyFront -= max(0, anatomyFront - lowerPlane) * lowerPlaneWeight`
    clips the anterior surface to LOWER_FRONT + crownLimit 0.033, which is
    below the plate's own 0.044 peak; and then
  - `if(front>0 && L.surfaceFaces)` blends `anatomyFront` onto
    `min(central, inner, outer)` with a weight that REACHES 1 over q 0.25-0.85,
    y 0.77-1.29 — where it is 1 the surface simply IS that target.
So `MRMAH_MORPHOLOGY.lower.planeDesign.surfaceFaces` is the live owner of the
anterior quad, and `plate` only survives at the edges where that weight tapers
(which is exactly where the 0.0003 showed up). This is the "duplicated baseline
is a silent no-op" trap again, one layer further down. `plate` is not dead —
it owns y > 1.34 — but it does not own the quad.

THE FAULT, evaluated through the live chain at the mesh's own anterior sample
columns (measured on the built mesh: q = 0.000 0.059 0.145 0.280 0.440 0.628
0.800 0.928, max gap 0.19 — nothing narrower than that can be seen):

    y 1.20    q0.145  q0.280  q0.440  q0.628  q0.800
              0.2090  0.2338  0.2375  0.2128  0.1736

A crown at q 0.28-0.44 and then ONE straight ramp all the way out. The mass is
inboard and the entire outer half of the quad is a plane — `surfaceFaces` is
`linearFaces:true`, three flat faces combined with a hard `min()`. That is why
the front view reads as a smooth sheet with the VM ribbon and the midline
channel scratched onto it. There was no outer sweep for an inner separation to
be separate FROM, so no additional groove could have produced one.

THE CHANGE — one variable family, two numbers, both as height profiles:
    outerTurn   0.52  ->  0.66   (outerTurnProfile)
    outerSlope  0.72  ->  0.86   (outerSlopeProfile)
The outer face's turn migrates outboard as it rises and steepens with it, which
is the vastus lateralis' own line. Crest depth, inner face, convexity,
footprint, region and every other coefficient are untouched.

Both profiles carry EQUAL knots at y 0.62 and 0.98. `profileAt` is
Fritsch-Carlson monotone cubic, so a flat pair forces a zero tangent at both
ends: that span is exactly constant and everything at or below y 0.98 is
bit-identical BY CONSTRUCTION rather than by tuning.

MEASURED ON THE BUILT MESH (before -> after, anterior z at the real columns):

    y 1.220   |x| 0.0000-0.1399  (q 0 - 0.441)   UNCHANGED to five decimals
              |x| 0.1995 (q 0.629)   0.21016 -> 0.22378   +0.0136
              |x| 0.2544 (q 0.802)   0.13170 -> 0.13849   +0.0068
              peak depth 0.23900 at |x| 0.1399   UNCHANGED
    y 1.340   |x| 0.1724   0.18607 -> 0.19961   +0.0135
              |x| 0.2199   0.13794 -> 0.14915   +0.0112

Whole-torso band scan: 46 of 2020 (x,y) columns moved, all of them in
y 1.0-1.4, max |dz| 0.0142. Every band at or below y 1.0 is exactly zero, as
is every band above 1.5.

GATES
  silhouette        ZERO pixels of outline change in the front, lower-front AND
                    side captures (per-row leftmost/rightmost lit pixel, matched
                    frames). `surfaceFaces` writes Z only, so the front outline
                    cannot move; the side outline is the peak depth, which is
                    unchanged. Not asserted from that argument — measured.
  knee band         NOT regressed. On the 3036-sample world grid the mean |dz|
                    over y 0.56-0.99 is 0.000002 and the single worst sample is
                    0.000593, at y 0.990 — above the band, inside the fade.
  new wedge/dent    NONE. Adjacent-face turns are identical to the baseline:
                    knee max 55, quad max 71 (379 faces), taper max 47. The
                    quad's top outliers are the pre-existing midline-channel
                    pair at x +/-0.04, untouched.
  topology          unchanged: 12288 vertices, 4096 triangles, same counts
                    before and after. Six vertices at y 1.06/1.14/1.28 shifted
                    by <= 0.0005 in x,y — they are the refineRecessEdges split
                    points, which are placed by raycast onto the surface they
                    sit on, so they ride it. No split was added or removed.
  BufferGeometry    0 non-finite positions, 0 degenerate triangles, 0 non-unit
                    normals, min triangle area 7.3e-7, all nine attributes at
                    equal count, bounds and bounding sphere recomputed clean.
  Mrs. Mah          UNCHANGED, proven not asserted. Her whole body group built
                    under baseline and candidate and compared mesh by mesh: 14
                    meshes, vertex counts, an order-independent AND an
                    order-dependent position checksum and both bounding-box
                    corners — identical.
  contracts         376/376.

VISUAL (matched clay, pose frozen with reducedMotion:'reduce', identical
camera, framing, lighting and material):
  three-quarter   the strongest read. The upper thigh's outer surface was a
                  flat plane meeting the dark side in a straight bevel; it is
                  now a rounded convex shoulder turning into the side, with a
                  soft longitudinal ridge running hip-to-knee. No hard edge.
  quad front      the lit mass carries visibly further outboard on both sides
                  and the early dark cliff at the outer third is gone.
  lower front     the upper thigh reads rounder; outline identical.
  side guard      no bulge, no puffiness; 813 changed pixels, all interior
                  shading.

KEEP-CANDIDATE.

NOT FIXED, and still open: the knee-band wedge is exactly as R237 left it —
max 55 degrees at y0.673 x +/-0.043, about 8x its local neighbours — and the
representation constraint stands (the crest is carried by one relocated vertex
per side sitting 0.015-0.020 from a ring, so a sampled crest and the sliver are
the same feature). The two proposed ways out are unchanged and still await
approval. Also unchanged and outside this pass: the rectangular panel on the
upper quad, which is the refineRecessEdges split at y .92-1.32 and is present
identically in both captures.

Proof: validation/mrmah3d/R238-quad/ — seven matched clay views before and
after, five before/after comparison sheets, and the bounded-edit contract
recorded before the edit.

NEXT: STOP FOR REVIEW. Calf, eyes, crystallization and platinum are not
started. A1 remains BLOCKED — WAITING FOR R168/R169 EYE SOURCE.


R238 — COMPARISON SHEETS AND HONEST VERDICT ON THE VISIBLE BENEFIT
---------------------------------------------------------------------------
No source was edited for this entry. The sheets in
validation/mrmah3d/R238-quad/SHEET-*.png are crops of the captures already
made for R238 — same camera, framing, pose, lighting, material, tier and image
scale, both halves on the identical crop rectangle and magnification. A PLAIN
(pixels only) and a LABELLED variant of each; the labelled one names the
checkpoints and outlines, per side, where the surface actually moved, with the
GAP between the boxes being the bit-identical inner face.

FINAL LIVE OWNER AND PARAMETER, after the ineffective trial was reverted:
  reverted   myofascial.js lowerField -> `plate` crest (via quadFaces).
             Built and measured: max |dz| 0.0003. It is clipped and then
             overwritten downstream; it owns y > 1.34 only.
  retained   proportions.js MRMAH_MORPHOLOGY.lower.planeDesign.surfaceFaces,
             read at myofascial.js torsoSurface. Two scalars became height
             profiles: outerTurn 0.52 -> 0.66 (outerTurnProfile) and
             outerSlope 0.72 -> 0.86 (outerSlopeProfile). Nothing else.

MEASURABLE SURFACE CHANGE THAT REACHED THE FINISHED MESH (already recorded
above; repeated here as the summary): at y 1.220 everything inboard of q 0.44
is unchanged to five decimals, q 0.629 goes 0.21016 -> 0.22378 (+0.0136) and
q 0.802 goes 0.13170 -> 0.13849 (+0.0068), with the peak depth unchanged at
0.23900. Against a limb depth of 0.239 at that height those are +5.7% and
+2.8%. 46 of 2020 columns moved, all in y 1.0-1.4, max |dz| 0.0142.

IN THE FRAME, over the changed band only (mean luma of lit pixels):
  front view   right band 53.9 -> 57.2 (+3.4 of 255), 14167 px changed
               left band  75.9 -> 74.5 (-1.4), 2324 px changed
  3/4 view     left band  81.1 -> 83.0 (+1.9), 5769 px changed
               right band 99.3 -> 97.4 (-1.9), 2412 px changed

VERDICT, split as the brief asks:

  PRESERVATION  PASS. Outline unchanged by zero pixels in front, lower-front
                and side; peak depth unchanged; inner face and the whole knee
                band bit-identical; face turns identical in all three bands;
                topology unchanged; Mrs. Mah's fourteen meshes identical.

  IMPROVEMENT   REAL BUT MODEST, and worth saying plainly. It is the right
                DIRECTION and it is not a transformation. What genuinely
                improved: the outer third of the quad used to end in a large
                near-black wedge where the surface turned away early, and there
                is now a graded turning surface between the lit front and the
                dark side — the outer-band zoom shows this most clearly, and
                the three-quarter shows a flat plane meeting the side in a
                straight bevel becoming a rounded convex mass. So the quad has
                an outer sweep it did not have, and the inner face is preserved
                as a distinct plane beside it.
                What did NOT improve: the front view still reads as a fairly
                smooth volume. A few luma over one band is a change a viewer
                would need the side-by-side to notice. The two things still
                stopping this region from reading as a full connected belly are
                unchanged by this pass and are NOT the outer sweep: the
                engraved vertical scratches down the centre (the VM ribbon and
                the midline channel) still read as LINES rather than as
                boundaries between masses, and the rectangular panel on the
                upper quad is still there. Neither was in this pass's scope.

KNEE / RIDGE DEFECTS STILL OPEN, unchanged by R238:
  - the knee-band wedge, max 55 degrees at y0.673 x +/-0.043, about 8x its
    local neighbours. The R237 representation constraint stands and the two
    proposed fixes still await approval.
  - the rectangular panel on the upper quad, y .92-1.32: the refineRecessEdges
    split, present identically in both builds.
  - the pre-existing midline-channel turns at x +/-0.04 (71, 69, 64 degrees),
    identical before and after.

The candidate is a candidate. It is NOT user-approved, and the retained
baseline remains A3 at 28d1f04.


R239 — THE ASTRA R109 ANTERIOR QUAD, RESTORED. THE FLAT SHIELD WAS A
POST-ASTRA REGRESSION, AND IT IS NAMED.
---------------------------------------------------------------------------
BRIEF: do not continue the flat-sheet quad direction; restore the Astra
implementation as literally as possible. Real volumetric quad mass, outer
sweep, readable belly, longitudinal flow into the taper, a front that reads as
anatomy rather than a smoothed shield with incisions. Mrs. Mah read-only.

ASTRA EXISTS IN THIS REPOSITORY AND IT WAS FOUND, NOT APPROXIMATED.
`ASTRA_HANDOFF.md` and commit 0c05b31, "R109 ASTRA TAKEOVER HANDOFF". Its
`character/` directory has no `myofascial.js` at all: the Astra lower body is a
RING-SHAPE implementation, `thighShape` in proportions.js, built from
`domePair` lobes around the ring. `git log -S` puts the whole current chain —
`surfaceFaces`, `linearFaces`, `lowerPlaneWeight` — at c7dbe13, the R223
reconstruction. So the flat front is not something this pass introduced; it
arrived with the R223 fork and replaced Astra.

THE REGRESSION, MEASURED ON BOTH BUILT MESHES at matched heights (0c05b31
checked out in a worktree and built headlessly; anterior z by angle from the
front seam):

    ASTRA y 1.100    0 deg 0.152 | 20 deg 0.240 | 37 deg 0.259 | 53 deg 0.192
    A3    y 1.140    0 deg 0.200 | 21 deg 0.221 | 30 deg 0.233 | 43 deg 0.204

Astra's section rises 70% from the seam to the quad crown. The R223-lineage
section rises 15%. THAT is the whole of "a flat shield with incisions instead
of quadriceps mass" — the crown was never the problem, the CENTRAL DESCENT and
the convex columns either side of it were missing, and no groove engraved on a
flat field could have produced them. It also explains why R238's outer-sweep
edit was only a modest win: it moved the right region by the wrong quantity.

THE RESTORATION. `MRMAH_MORPHOLOGY.lower.astraQuad` carries Astra's own lobe
geometry and its own per-row coefficients verbatim from 0c05b31 —

  seam   centre 0.00 rad, half-width 0.30   the central descent (single dome)
  head   0.70 / 0.75                        the thigh column's roundness
  rf     0.42 / 0.28                        the rectus ridge on it
  valley 1.00 / 0.30                        the RF / VL separation
  vl     1.42 / 0.55                        the lateral sweep, 50 to 113 deg
  vm     0.30 / 0.32                        the medial teardrop, low
  itb    1.95 / 0.30                        the flat outboard of the sweep

— with the posterior terms (glute, cleft, ham, hamCleft) deliberately left out
because this restoration is anterior only. `dome` and `domePair` are copied
verbatim into myofascial.js. Angles are radians from the front seam, which is
already `torsoSurface`'s convention (front = max(0, sin a)), so the lobes
needed no re-basing.

`torsoSurface` evaluates it and the TWO FLATTENERS yield to it: the
`lowerPlane` clip (which capped the front at LOWER_FRONT + 0.033, below the
plate's own peak) and the `surfaceFaces` min-of-three-planes blend are both
scaled by (1 - astraWeight). Outside the quad band they are untouched.

TWO THINGS THE FIRST BUILD GOT WRONG, both caught by measuring:
  - the peak came out 0.298 against Astra's own 0.245, 25% too deep, because
    the port applied `m` to the depth alone. In Astra the shape multiplied a
    ring RADIUS and the ring turned that into depth, so z was sin(a)*d*shape.
    Multiplying by `front` (= sin a), the same falloff `anteriorStock` already
    uses, fixed it in one term.
  - carrying the field down to y 0.80 put 60-66 degree creases on the front
    MIDLINE at y 0.837 and 0.937, where the body is too narrow to carry a
    0.30-radian descent. Astra's own lowest thighShape row is y 0.870 and below
    it the rings hand over to `lowerLegShape`, which has no seam. The region is
    0.88-1.46 now, which is Astra's own extent, and both creases are gone.

RESULT, on the built mesh (anterior z by angle from the seam):

    y 1.220   BASELINE A3   0 deg 0.208 -> crown 0.239   rise 15%
              R238          0 deg 0.208 -> crown 0.239   rise 15%
              R239          0 deg 0.157 -> crown 0.268   rise 71%
              ASTRA 1.230   0 deg 0.139 -> crown 0.245   rise 76%

Astra parity on the thing that matters. The seam drops 0.208 -> 0.157 and the
crown rises 0.239 -> 0.268.

GATES
  front silhouette  ZERO pixels of outline change (astraQuad writes Z only;
                    LOWER_WIDTH still owns the outline). Half-width at every
                    measured row identical: 0.241 0.282 0.306 0.318 0.302 0.275.
  side projection   DELIBERATELY CHANGED and reported as such: the quad crown
                    goes 0.239 -> 0.268, +12%. That is the brief's "the quad
                    mass actually projects", and it is close to Astra's own
                    0.245-0.259. NOTE: the outline extractor reports 0 px on
                    the side capture, but that is NOT evidence about the thigh
                    — the lowered hand is the frontmost thing at those rows.
                    The mesh number above is the honest one.
  knee band         y 0.56-0.76 max |dz| 0.00012; the field fades in above
                    0.88. Adjacent-face max 56 deg against the baseline's 55.
                    The 55 deg at y0.673 x +/-0.043 is unchanged.
  taper             max 47 deg, identical. One fused point, untouched.
  topology          12288 vertices, 4096 triangles, unchanged.
  BufferGeometry    0 non-finite, 0 degenerate, 0 non-unit normals, attributes
                    at equal count, bounds and sphere clean.
  Mrs. Mah          14 meshes, both checksums, both bbox corners — IDENTICAL.
  contracts         376/376.

VISUAL — the front and three-quarter both change decisively. The quad reads as
two convex columns with a broad central valley between them, an outer sweep
falling to the contour on each side, and a longitudinal flow that carries into
the taper. The centre is now subordinate: a valley between two masses instead
of an incision on a dead surface.

HONEST REMAINDER. The quad band's adjacent-face maximum went 71 -> 123 degrees,
at y 1.028 and 1.072, x +/-0.125-0.134. Probed: `tri689` and its mirror are
NEAR-DEGENERATE slivers — three almost collinear vertices spanning three rows
in one column, area 7.4e-4 against a 3e-3 neighbourhood — left over from the
loft's changing side count, present in the baseline too, where their normals
happened to point forward. A steeper field swings an ill-conditioned normal;
the clay debug view shades from `aSmooth`, which is area-weighted, so a
near-zero-area face contributes almost nothing to it. Per the standing
curvature law the number is a diagnostic and the clay is the authority, and the
clay does not show a sliver there. What the clay DOES show, and what is real,
is that the steeper field makes the pre-existing facet seams more visible in
the extreme close-up than R238 did — the rectangular panel from the
refineRecessEdges split at y .92-1.32 and a hard quadrilateral on the upper
outer thigh. Those are faceting, they are separately owned, and the brief puts
them after the anatomy ("muscle mass first, then crystallisation later").

Proof: validation/mrmah3d/R239-astra-quad/ — seven matched clay views plus four
labelled R238-vs-R239 comparisons, and the Astra R109 torso vertex dump the
measurements were taken from.

R239 IS A CANDIDATE AND IS NOT USER-APPROVED. The retained baseline is still
A3 at 28d1f04.


R240 — SURFACE CLEANUP ON R239. THE PANEL AND THE SEAMS WERE THE OLD RAILS'
FORCED EDGES, AND THE ANATOMY IS BIT-IDENTICAL AFTERWARDS.
---------------------------------------------------------------------------
BRIEF: keep R239 as the active candidate and continue from it. Surface cleanup
only — the hard rectangular panel, the upper outer-thigh quadrilateral, harsh
facet seams made newly visible by the restored field. Do not flatten the front
again, do not lose the centre valley or the outer sweep. Reduce the side
projection surgically only if the front read survives it.

OWNER, FOUND BY ISOLATION (four runs, each built and measured):
  remove the y .92-1.32 refineRecessEdges split   quad max 123 -> 123  (no-op)
  remove the whole quad/knee patch                quad max 123 ->  60
  rails out of `paths`, kite kept                 quad 123 -> 79, KNEE 56 -> 112
  rails as SINGLE-POINT paths, kite kept          quad 123 ->  81, KNEE 56 (=)

So the panel and the seams are the R164 quad rails' FORCED EDGES, not the
split. `conformSurfacePatch` excludes constraint edges from its empty-circle
pass, so with the Astra field steep across them the triangulation could not
relieve them and they read as hard planar breaks. Note the first line: the
refineRecessEdges split, which this document has blamed for the rectangular
panel since R238, is NOT the owner. That attribution was wrong and is
corrected here.

THE CHANGE — one line in `quadKneeSurfacePatch`. `medial` and `crown` become
single-point paths, so they still claim and move their vertices (the anatomy is
sampled where it was authored) and register no pair (the diagonals are free).
The knee kite keeps its edges and its crest untouched. Dropping the crown
rail's landmarks as well was also measured: 81 -> 79 degrees for the loss of
the rail's anatomy support, and rejected. The residual 78-81 at y 1.015 / 1.100
x +/-0.117-0.131 is a near-degenerate sliver in a sparse column of the loft
(n = 8 neighbours) and does not belong to the rails.

SIDE PROJECTION — REDUCED, per the brief's rule. R239 put the quad crown at
0.268 against the baseline's 0.239 and Astra's own 0.245-0.259, i.e. slightly
deeper than Astra itself. `astraQuad.projection` 1.00 -> 0.94 lands it at 0.252,
inside Astra's band, and cuts the delta over the baseline from +12% to +5%.
The scale is uniform, so the seam-to-crown RISE — which is what carries the
front read — is unchanged at 70% (R239 71%, Astra 70-76%), and the extreme
close-up before and after is visually equivalent. The brief's condition ("if it
can be reduced without sacrificing the restored front read, do so") is met.

RESULT
  quad band max      123 -> 78 degrees; p99 123 -> 76; p90 33 -> 32
  knee band          55 / 55, EXACTLY the R239 and baseline values
  taper              47, identical
  section y 1.220    seam 0.148, crown 0.252, rise 70%
                     (R239 0.157 / 0.268 / 71%; baseline 0.208 / 0.239 / 15%)
  front outline      zero pixels changed against R239, front and lower-front
  half-width         identical at every row
  topology           12288 vertices, 4096 triangles, unchanged
  BufferGeometry     0 non-finite, 0 degenerate, 0 non-unit normals
  Mrs. Mah           14 meshes, both checksums, both bbox corners — IDENTICAL
  contracts          376/376

VISUAL. The rectangular panel is gone. The upper outer-thigh quadrilateral is
gone. The vertical seams down the quad are gone. What remains is the R239
anatomy: two convex anterior columns, a broad central valley, the outer sweep,
and the longitudinal flow into the taper — now on a continuous surface. This is
the largest visible improvement of the recent passes and it cost no anatomy:
between R239 and the rails change the section is identical to three decimals at
every sampled angle and height, because only the triangulation moved.

R240 IS A CANDIDATE AND IS NOT USER-APPROVED. Retained baseline: A3, 28d1f04.

STILL OPEN, unchanged: the knee-band wedge (55 degrees at y0.673 x +/-0.043)
and its representation constraint from R237, with two fixes proposed and
awaiting approval; and the near-degenerate slivers in the sparse loft columns,
which the clay does not show.


R241 — THE CENTRAL DESCENT IS EASED. THE SEAM CONTROL MOVES ONLY THE FLOOR,
AND THAT WAS VERIFIED ON THE FINAL MESH BEFORE IT WAS TOUCHED.
---------------------------------------------------------------------------
SCOPE NOTE. This turn carried two briefs. The first asked for central-valley
softening AND rectus/vastus emphasis AND knee-region structure AND lower-leg
anatomy. The second, later one narrows to the central separation alone and says
plainly "Do not add knee, shin, calf, crystal, or material work in this task"
and "one candidate, with at most one focused revision". The narrower brief is
the one followed. Knee, shin and calf anatomy were NOT attempted and remain
open work.

OWNERSHIP, VERIFIED FIRST (the brief asked for this explicitly). Zeroing
`astraQuad.seam` and rebuilding, measured on the final mesh at y 1.220:

    seam 0.30 (R240)   floor 0.1479   crown 0.2517   valley 0.1039
    seam 0.00          floor 0.2085   crown 0.2517   valley 0.0432

The crown is IDENTICAL to four decimals at both settings. So this control moves
the channel FLOOR and nothing else — the quad crowns cannot be harmed by
changing it, and the floor responds linearly at 0.202 units of depth per unit
of coefficient. That is what made a single bounded correction safe.

THE CORRECTION — one lobe, two numbers, nothing else touched:
  amplitude   Astra's own seam profile scaled to 0.55 (peak 0.30 -> 0.165)
  half-width  0.30 -> 0.34 radians
`dome`'s steepest wall sits at 0.707 of its half-width and its slope there is
1.5 * amplitude / half-width, so the pair takes the inner wall to 0.49 of its
previous steepness — the channel is EASED, not merely widened, which the brief
ruled out. `head`, `rf`, `valley`, `vl`, `vm` and `itb` are untouched.

RESULT, on the built mesh:

    y 1.220   floor 0.1479 -> 0.1752   (+18%)
              crown 0.2517 -> 0.2517   (identical)
              valley depth 0.1039 -> 0.0766   (-26%)
              crown/floor 1.702 -> 1.437
    y 1.140   floor 0.1482 -> 0.1754, crown 0.2540 unchanged, depth -26%

Section at y 1.220, anterior z by angle from the seam:
    R240   0:0.148  7:0.154  14:0.185  21:0.236  29:0.252  43:0.214  62:0.136
    R241   0:0.175  6:0.180  13:0.200  21:0.235  29:0.252  43:0.214  62:0.136
Identical from 29 degrees outward. The change is confined to the inner quarter
of the section, and the profile still rises monotonically from the midline —
NO CENTRE RIDGE; the midline remains the minimum.

GATES
  quad crown projection  PRESERVED EXACTLY (0.2517 / 0.2540 / 0.2454 / 0.2141)
  outer sweep            untouched, identical from 29 degrees out
  front + side outline   zero pixels changed
  knee band              y < 0.9 max |dz| 0.000013; the change lives in
                         y 0.9-1.45 only
  face turns             knee 55 (=), quad max 78 -> 74, taper 47 (=) — the
                         eased wall slightly IMPROVES the quad band
  R240 cleanup           held: no panel, no block artifact, no new seams
  topology               12288 vertices, 4096 triangles, unchanged
  BufferGeometry         0 non-finite, 0 degenerate, 0 non-unit normals
  Mrs. Mah               14 meshes, both checksums, both bbox corners IDENTICAL
  contracts              376/376

VISUAL. At the quad framing the channel reads as a broad soft valley between
two convex masses instead of a dark stripe. At ordinary full-character distance
the two quad volumes read before the centre, which is the brief's success test.
The separation is still clearly present close up. Honest scale: this is a real
but measured move — a 26% reduction, not a transformation — and the remaining
headroom is known and one number away (the natural two-dome valley with the
seam at zero is 0.0432, so about half the present depth is still authored).

The earlier 71% seam-to-crown figure was a restoration diagnostic and is NOT
being preserved as a target; it is 44% now by the same measure, deliberately.

R241 IS A CANDIDATE AND IS NOT USER-APPROVED. Retained fallback: A3, 28d1f04.

STILL OPEN: knee-region structure, lower-leg / shin / calf read, and the
R237 knee-band wedge with its two proposed fixes.


R242 — LOWER-BODY ANATOMY REFINEMENT: THE KNEE WEDGE, ASTRA'S LOWER-LEG
GRAMMAR, AND A 3% FULLER QUAD WITH THE CHANNEL HELD WHERE IT WAS.
---------------------------------------------------------------------------
Base R241 (b9e87c0). Four bounded changes, each measured, all in the lower body.

1. THE KNEE WEDGE — the R237 fix, narrowed by measurement to one corner.
   The loft's natural rings in this band carry 174 / 170 / 154 / 168 vertices at
   y 0.550 / 0.660 / 0.770 / 0.870. `QUAD_KNEE_LAYOUT.knee`'s bottom corner sat
   at y 0.645 — a 24-vertex row 0.015 BELOW a 170-vertex ring — and the fan
   between them held the sliver that has read as the knee wedge since R235.
   Moved onto 0.660 the landmark claims a vertex already on the ring and moves
   it in x only. Knee band 55 -> 47 degrees, p90 33 -> 29.
   Both other variants were built and rejected: moving the 0.790 corner too
   gave 101 degrees, moving 0.790 alone 82, because landing a landmark on a row
   that already has a vertex nearby crowds it into a thin triangle. And the
   knee crest was checked against R237's gate — relief at y 0.85 / 0.90 / 0.95
   went 0.0210 / 0.0246 / 0.0417 -> 0.0218 / 0.0286 / 0.0540, i.e. slightly
   STRONGER, the opposite of A3b's failure.

2. ASTRA'S LOWER-LEG GRAMMAR — `MRMAH_MORPHOLOGY.lower.astraLowerLeg`, ported
   from `lowerLegShape` and the rings y 0.300-0.810 of the same R109 checkpoint.
   Anterior: `notch` (the centre channel continuing down from the quad's seam),
   `shins` (the tibial ridges). Posterior: `pit`, `tendon`, `hollow`, plus a
   light `soleus`.
   Applied as a small MULTIPLICATIVE relief on the surface already there, not as
   a replacement, because Astra's handoff is explicit that this body has NO calf
   belly in the outer silhouette and its lower-leg musculature is "suggested only
   by internal form". Measured: the outer envelope |x|max is IDENTICAL at every
   ring row from y 0.45 to 0.90; only the z span moves, by 0.005.
   ONE number here is not Astra's: `soleus` is a lobe `lowerLegShape` defines
   but the R109 rows never used, added at 0.015-0.025 because the brief asks for
   a light calf read. It is the only invented value in the table.

   Two faults were found and fixed by measurement while fitting it:
   - Astra's rows SWAP from `shins` (to y 0.72) to `caps` (at 0.81). Astra's own
     comment warns why that is dangerous — "the columns FLIPPED between the two
     rings and the clay showed a zigzag of seams across the shin" — and it could
     afford it because its rings are denser here. On this loft the swap lands
     across ONE band and measured 59 degrees at y 0.743. The two lobes are the
     same ridge (29 and 26 degrees off the midline), so `caps` is held at zero
     and `shins` carries it continuously.
   - `notch` and `pit` ending at y 0.90 left a gap before the quad's `seam`
     fades in at 0.88, and that row step measured 58 degrees at y 0.827. The
     region reaches 0.98 now so the two overlap.
   - The tibial crest is tapered THROUGH the knee rather than held across it
     (isolated: zeroing `shins` alone took the band 58 -> 50).

3. RECTUS AND VASTUS MEDIALIS — rf 0.10 -> 0.13, vm carried higher (0.04 -> 0.09
   at y 1.03, and a trace to 1.23 where it was zero). Crown 0.2517 -> 0.2596 at
   y 1.220, +3.1%: "slightly more muscular overall", and slight, as asked.

4. THE SEAM, COMPENSATED. Raising the crown widened the valley from 0.0766 to
   0.0841 even though its floor had not moved, which would have undone R241.
   Since the seam control moves the floor linearly at 0.202 units per unit of
   coefficient, its profile is scaled again to 0.776 and the floor rises by what
   the crown gained. Valley depth at y 1.220 is 0.0766 — R241's figure exactly —
   with crown/floor 1.419 against R241's 1.437 and R240's 1.702. The muscle
   grows; the separation does not.

RESULT
  knee band          max 55 -> 54, p90 33 -> 30, p99 55 -> 54; the y 0.673
                     wedge that has been the standing artifact since R235 is
                     GONE. What remains is 53 at y 0.827 and 51 at y 0.605.
  quad band          74 -> 76 on the known near-degenerate sliver column at
                     y 1.100 x +/-0.130 (n = 8), not a new location; R240 was 78.
  taper              47, unchanged.
  centre channel     valley depth 0.0766, identical to R241.
  crown              0.2517 -> 0.2596 (+3.1%).
  silhouette         front and side outlines zero pixels changed; the lower-leg
                     envelope |x|max identical at every ring row.
  topology           12288 vertices, 4096 triangles, unchanged.
  BufferGeometry     0 non-finite, 0 degenerate, 0 non-unit normals.
  Mrs. Mah           14 meshes, both checksums, both bbox corners IDENTICAL.
  contracts          376/376.

VISUAL. The knee now converges as a band rather than ending in a chevron notch,
and the taper below it carries longitudinal shin structure with the centre
channel running on down instead of stopping. The quad is fractionally fuller
and otherwise as R241 left it. Honest scale: this is a SUBTLE pass, as the brief
asked — the knee and shin changes are visible in the close-up and modest at
ordinary distance.

R242 IS A CANDIDATE AND IS NOT USER-APPROVED. Fallback: A3, 28d1f04.

STILL OPEN: the near-degenerate sliver columns in the quad (a loft sampling
property, not an authored feature); the 53-degree turn at y 0.827; and no
crystal or material work has begun.


R243 — THE CENTRAL SPLIT, CORRECTED FROM BOTH SIDES. THE 3/4 READ IS THE FIX
THAT MATTERED.
---------------------------------------------------------------------------
Base R242 (43e780f). The brief's items 4 and 5 — rectus, vastus lateralis,
vastus medialis, knee delicacy, tibialis / shin direction, light soleus, and
the knee-region artifact — were all delivered in R242, which is this pass's
BASE; they are preserved here and were re-verified, not re-done. The new work
is items 1-3: the centre channel, the three-quarter read, the side profile.

TWO CONTROLS, SWEPT AND MEASURED before choosing. Five builds at y 1.220:

    seam x   seam hw   head hw     floor    crown    valley   crown/floor
    1.00     0.34      0.75        0.1830   0.2596   0.0766   1.419   (R242)
    0.66     0.40      0.75        0.1918   0.2596   0.0678   1.354
    0.66     0.40      0.80        0.2011   0.2608   0.0597   1.297   <- taken
    0.47     0.44      0.80        0.2060   0.2608   0.0548   1.266
    0.78     0.38      0.78        0.1942   0.2603   0.0662   1.341

The crown moves by at most 0.0012 across the whole sweep, so the side profile
was never at risk from either control — which is what made the decisive option
safe to take rather than another timid step.

THE FIX IS FROM BOTH SIDES, and that is the point. `head`'s half-width goes
0.75 -> 0.80 so the two quad domes MEET nearer the midline — measured alone it
lifts the floor 0.1918 -> 0.2011 — and only then is the seam scaled to 0.66.
The floor is filled from the MUSCLE side, not merely carved less, so the centre
reads as a separation between two neighbouring masses rather than a groove cut
into one surface. The seam's half-width also goes 0.34 -> 0.40, feathering the
transition.

RESULT at y 1.220
  floor          0.1830 -> 0.2012
  valley depth   0.0766 -> 0.0596   (-22% here, -43% against R240, -55% against
                                     R239's restoration diagnostic)
  crown          0.2596 -> 0.2608   (+0.5%, i.e. the quad is not reduced)
  crown/floor    1.419 -> 1.296

GATES
  three-quarter  FIXED, and this was the actual complaint: the dark line that
                 ran the full length of the thigh and split it into two masses
                 is gone; the lower body reads as one continuous fused teardrop
                 with an internal soft valley.
  front          controlled definition rather than a split; both quad masses
                 still read.
  side profile   PROTECTED. Outline zero pixels changed; crown +0.0012.
  silhouette     front and side outlines zero pixels; the lower-leg envelope
                 |x|max identical at every ring row from 0.45 to 0.90.
  knee band      54 max, p90 30 — unchanged from R242; R242's knee fix holds.
  quad band      76 -> 73, p90 30 -> 27 — slightly better.
  taper          47, unchanged. One fused point.
  topology       12288 vertices, 4096 triangles, unchanged.
  Mrs. Mah       14 meshes, both checksums, both bbox corners IDENTICAL.
  contracts      376/376.

R243 IS A CANDIDATE AND IS NOT USER-APPROVED. Fallback: A3, 28d1f04.

The channel's remaining depth is now mostly GEOMETRIC rather than authored: with
the seam at zero the two domes alone leave about 0.050 of valley, against the
0.060 present. Further softening therefore has little room left in this control
and would have to come from the dome spacing itself.


R244 — THE OUTER CONTOUR DESCENDS CLEANLY, AND THE CENTRE IS QUIET.
---------------------------------------------------------------------------
Base R243 (6804a44), clean tree, designated branch — verified before editing,
as the brief asks. Live owners re-verified from the built mesh, not assumed:
LOWER_WIDTH owns the outline; `astraQuad` (seam / head / rf / vl / valley / vm)
owns the anterior quad; `astraLowerLeg` owns the shin and calf.

THE DIRECTOR'S MARKUP WAS MEASURED, NOT EYEBALLED. The blue strokes trace the
outer contour on both sides. `readmarkup.mjs` decodes the JPEG in chromium,
isolates the saturated blue, and `mapmarkup.mjs` maps it into world units by
calibrating the sheet from two unambiguous landmarks — the terminal point
(world y 0) and the lower body's own widest row (y 1.220, half-width 0.318).
Filed at validation/mrmah3d/R244-contour-and-centre/DIRECTOR-blue-markup.jpg.

Honest limits of that measurement: the stroke has real thickness (about 0.015
world at this scale) and the render's edge extraction failed at two rows, so
the per-row numbers carry roughly +/-0.02. What it shows CONSISTENTLY is the
markup sitting outside the current outline through the knee and upper shin —
which agrees with a defect measurable directly in the table.

THE DEFECT, in LOWER_WIDTH's own slopes:

    y .43-.62  0.279   .62-.70  0.325   .70-.78  0.175  <- flat spot
    y .78-.88  0.230   .88-.98  0.460  <- flare   .98-1.08  0.430

The knee-to-thigh run went nearly straight and then kicked out. That is exactly
the "random side swell that fights the taper" the brief rules out, and it is why
the descent did not read as authored. Four inner knots are re-authored so the
slope eases 0.310 / 0.330 / 0.340 / 0.350 / 0.320 — one continuous bloom. The
apex (1.22, .318), everything above it, the knots below .62 and the terminal
point are untouched: this neither slims the form nor moves its widest mass.
Largest change +0.022 at y .88.

    y .70  .163 -> .162     y .78  .177 -> .188
    y .88  .200 -> .222     y .98  .246 -> .257

THE CENTRE, from both sides again. `head` moves in to 0.64 rad and widens to
0.86 so the two quad domes carry most of the midline themselves, and only then
is the seam scaled to 0.70. Swept across five builds before choosing.

    y 1.220     floor   crown   valley
    R243        0.2012  0.2608  0.0596
    R244        0.2318  0.2650  0.0332

The valley is 44% below R243, 57% below R240 and 68% below R239 — present and
clearly subordinate, not removed (crown/floor 1.143). The outer sweep is
untouched: at 42 / 62 / 71 degrees the section reads 0.219 / 0.137 / 0.099
against R243's 0.217 / 0.138 / 0.100.

SURFACE QUALITY improved as a side effect, which is the useful evidence that
the contour was genuinely strained: removing the pinch and quieting the centre
took the knee band 54 -> 51 and the quad band 73 -> 65, p90 30 -> 27.

GATES
  fused read      front and three-quarter both read as ONE teardrop; the
                  dividing line is now a soft internal transition.
  side profile    outline zero pixels changed; crown +0.0042 (+1.6%).
  taper           one continuous descent to one point.
  knee band       51 max (was 54), p90 29.
  quad band       65 max (was 73), p90 27.
  taper band      47, unchanged.
  topology        12288 vertices, 4096 triangles, unchanged.
  BufferGeometry  0 non-finite, 0 degenerate, 0 non-unit normals.
  Mrs. Mah        14 meshes, both checksums, both bbox corners IDENTICAL.
  contracts       376/376.

SCOPE. The brief's sections 5-7 (rectus, vastus lateralis, vastus medialis,
knee delicacy, tibialis, soleus) were built in R242 and refined in R243; they
are preserved and re-verified here rather than re-done blind. This pass is
sections 2, 3 and 4 — the centre, the fused read and the contour — which the
brief's own priority order puts first.

R244 IS A CANDIDATE AND IS NOT USER-APPROVED. Fallback: A3, 28d1f04.


R245 — MUSCLE ORGANISATION WITHIN THE THIGH MASSES. THE LOBES WERE OUTBOARD OF
WHAT THE FRONT VIEW READS, AND R244'S CENTRE FIX HAD SWAMPED THEM.
---------------------------------------------------------------------------
Base R244 (da607c2), clean tree, designated branch. NOTE: the brief names
`MR_MAH_LOWER_BODY_CONSOLIDATED_MASTER.md`; that file does not exist in this
repository. The handoff directory holds MR_MAH_MASTER.md, MR_MAH_PROJECT_STATE.md
and the two steer packs. This pass follows MR_MAH_MASTER.md's regional loop and
this file's open items, and the discrepancy is recorded rather than papered over.

DIAGNOSIS, measured on the built mesh. The anterior section at y 1.220 read

    ring angle 0.00  0.06  0.15  0.28  0.46  0.68  0.93  1.19
    depth      .232  .235  .251  .265  .265  .219  .137  .099

— ONE monotonic hump with no internal structure at all. Two causes, both found
by measurement:
  - R244 widened `head` to 0.86 rad to fill the midline, and that broad dome
    swamped every smaller lobe riding on it;
  - `valley` sat at 1.00 rad and `vl` at 1.42, both OUTBOARD of the columns the
    front view actually reads. The mesh samples the anterior at ring angles
    0, 0.06, 0.15, 0.28, 0.46, 0.68, 0.93 and 1.19 rad, so a lobe centred at
    1.42 puts its peak past the last column that carries the front read.

THE CHANGE — placement, not depth. `rf` in to 0.34 (hw 0.30) and up to 0.20;
`valley` in to 0.66 (hw 0.22) and up to 0.17, which sets it BETWEEN the columns
at 0.46 and 0.68; `vl` in to 1.02 (hw 0.44) and up to 0.32, landing it on the
0.93 and 1.19 columns instead of past them.

`head` is deliberately NOT narrowed. Narrowing it was built and measured twice
(0.76 and 0.72 rad, with the seam cut to 0.55 and 0.40 to compensate) and it
re-opened the centre valley from 0.0332 to 0.0576 and 0.0662. The centre is
therefore exactly as R244 left it — floor 0.2318 at y 1.220, unchanged to four
decimals — which is what the review asked for.

RESULT
  section y 1.220   .232 .235 .251 .273 .269 .214 .148 .107
                    an RF crown at 0.28 rad with an inversion at 0.46, and the
                    outer columns fuller (0.93: .137 -> .148, 1.19: .099 -> .107)
  crown             0.2650 -> 0.2733 (+3.1%)
  centre floor      0.2318, IDENTICAL
  front / side      outlines zero pixels changed
  envelope          |x|max identical at every ring row 0.45-0.90
  knee band         51 max, p90 30 — unchanged
  quad band         65 max — unchanged
  taper             47 — unchanged
  Mrs. Mah          14 meshes IDENTICAL;  contracts 376/376

THE KNEE-ADJACENT PATCH — status changed, and this is the useful finding. It no
longer has a single owner. Zeroing each contributing term in turn and rebuilding:

    notch zeroed   51 -> 49        shins zeroed   51 -> 50
    tendon zeroed  51 -> 51        (soleus build failed, retest)

No term moves it more than 2 degrees, where every earlier knee artifact had ONE
owner worth 8-60 degrees. The remaining 51 at y0.605 x+/-0.037, 48 at y0.747 and
47 at y0.827 are the shin and notch anatomy crossing the loft's rings at this
sampling density — distributed, not a defect with a fix. Reducing them further
means removing the tibial ridge and centre channel the brief asks to keep, so
they are RECORDED and not chased, per the standing curvature law. This is a
different status from "open with two proposed fixes"; the single-owner knee
wedge was closed in R242.

R245 IS A CANDIDATE AND IS NOT USER-APPROVED. Fallback: A3, 28d1f04.


R246 — MORE QUAD SEPARATION, AND THE CENTRE HELD BY ARITHMETIC.
---------------------------------------------------------------------------
Base R245 (2a77854). One controlled step: `rf` x1.15, `valley` x1.60, `vl` x1.25
on the R245 placements, with the seam cut to 0.40 to compensate.

THE PROTECTION IS MEASURED, NOT JUDGED. The brief's rule is that a quad move
which strengthens the middle line is too aggressive. Two facts settle it:
  - these three lobes CANNOT deepen the midline. Their supports start at 0.06,
    0.44 and 0.58 rad, and a four-build sweep confirmed the centre floor stays
    0.2318 to four decimals at every strength tried, up to x1.90 on `valley`.
  - what they DO move is the crown, 0.2733 -> 0.2803, and a taller crown over an
    unmoved floor is a louder centre line by contrast even though the groove is
    untouched. The seam control moves the floor linearly, so cutting it to 0.40
    lifts the floor to 0.2390 and holds the centre valley at 0.0413 against
    R245's 0.0414.
So the masses grew and the middle did not, by construction rather than by eye.

SECTION at y 1.220, ring angle from the seam:

    R245   .232 .235 .251 .273 .269 .214 .148 .107
    R246   .239 .242 .258 .280 .272 .209 .151 .111

  crown to dip (0.28 -> 0.68)   0.059 -> 0.071   +20% RF/VL separation
  outer columns (0.93 / 1.19)   .148/.107 -> .151/.111   fuller VL
  centre floor                  .232 -> .239   HIGHER, i.e. quieter
  centre valley                 0.0414 -> 0.0413

GATES
  front / side outlines   zero pixels changed
  envelope                |x|max identical at every ring row 0.45-0.90
  knee band               51 max, p90 30 — unchanged
  quad band               65 max — unchanged
  taper                   47 — unchanged; one fused point
  topology                12288 vertices, 4096 triangles
  BufferGeometry          0 non-finite, 0 degenerate, 0 non-unit normals
  Mrs. Mah                14 meshes IDENTICAL
  contracts               376/376

ANSWERS TO THE BRIEF'S SIX QUESTIONS
  1. quad organisation more readable — YES: the RF crown rises and the RF/VL
     dip deepens 20%, and the front and quad close-up show it.
  2. centre line too strong — NO: floor RAISED 0.232 -> 0.239, contrast held at
     0.0413 against 0.0414.
  3. fused teardrop intact — YES: outlines zero pixels, one point, no split
     impression in three-quarter.
  4. three-quarter — improved slightly (more internal definition, same fused
     read); not regressed.
  5. knee harshness — UNCHANGED at 51/30. Not reduced this pass. R245 established
     it has no single owner (zeroing notch 51->49, shins 51->50, tendon 51->51),
     so reducing it means removing the shin and channel anatomy the brief keeps.
  6. OPEN: the distributed knee-band turns above; shin/calf clarity beyond what
     R242 built; no crystal or material work has begun; A1 eyes still BLOCKED.

Per the brief's priority order this pass stopped after the safe quad step and
did NOT advance shin/calf. R246 IS A CANDIDATE AND IS NOT USER-APPROVED.
Fallback: A3, 28d1f04.


R247 — PHASE 3, THE KNEE TRANSITION. THE QUAD'S OWN DISTAL COEFFICIENTS WERE
DEAD CODE.
---------------------------------------------------------------------------
Base R246 (6baade2). The consolidated master's phase list puts phases 1 and 2
(centre calming, quad organisation) at R244-R246; this pass is PHASE 3 and
nothing else. Phases 4 (shin/calf beyond R242), 5 (arms) and 6 (shoulder) were
NOT attempted — see the note at the end.

THE DEFECT, measured on the built mesh. The anterior profile by ring angle:

    y 0.870   0.133  0.135  0.140  0.136  0.084  0.052    <- flat, no structure
    y 1.060   0.232  0.237  0.247  0.269  0.208  0.146    <- a real crown

`astraQuad.region` began at 0.88, so the quad's organisation switched on
abruptly between those rows rather than landing into the knee. Worse, its own
coefficient table carries knots at y 0.80 and 0.87 — vl 0.16, vm 0.20,
valley 0.06 — and the region made every one of them DEAD CODE. The distal quad
had authored values that could never reach the mesh.

THE CHANGE — one number. `region` 0.88 -> 0.80, so the authored 0.80 and 0.87
coefficients do their job and the field fades in over 0.80-0.94.

    y 0.870 after   0.137  0.140  0.145  0.133  0.084  0.057
                    a crest and a fall: the distal quad arriving.

AND THE KNEE BAND GOT QUIETER, not harsher: median 8 -> 7, p90 30 -> 29, max 51
unchanged. A structure that tapers strains the surface less than one that stops.
Reaching further down was built and rejected: 0.74 gave p90 32, 0.70 gave max 53.

GATES
  centre           floor 0.2390, valley 0.0413 at y 1.220 — IDENTICAL to R246
  front / side     outlines zero pixels changed
  envelope         |x|max identical at every ring row 0.45-0.90
  knee band        median 7, p90 29, max 51 — improved
  quad band        67 (R246 65) — the known sliver column, within its range
  taper            47 — unchanged; one fused point
  topology         12288 vertices, 4096 triangles
  BufferGeometry   0 non-finite, 0 degenerate, 0 non-unit normals
  Mrs. Mah         14 meshes IDENTICAL
  contracts        376/376

VISUAL: the distal quad masses now converge into the knee instead of fading
out, and the transition is graded rather than abrupt. No facets, no notch, no
smoothing away — the landmark is more present, not less.

WHAT WAS NOT TOUCHED, and why it is not a claim of completion:
  - Phase 4 (shin / calf beyond what R242 built) — not attempted.
  - Phase 5 (arms, both characters) — NOT STARTED. The master describes the
    arms as reading like stacked circles rather than one integrated limb, on
    BOTH characters. That is a large region with its own owners
    (`arm-anatomy.js`, `limbs.js`) which this session has only touched once, to
    stop `authoringMaster` leaking into Mrs. Mah. It deserves its own diagnosis
    pass and should not be started as an afterthought at the end of a lower-body
    pass. Nothing about the arms has been measured this session.
  - Phase 6 (shoulder / deltoid / torso connection) — not started.
  - A1 eyes — still BLOCKED on the R168/R169 runtime source.

R247 IS A CANDIDATE AND IS NOT USER-APPROVED. Fallback: A3, 28d1f04.


R248 — PHASE 1 AGAIN: A MIDLINE BRIDGE, AND THE FIRST TIME THE CENTRE LINE WAS
MEASURED AS THE EYE SEES IT.
---------------------------------------------------------------------------
Base R247 (9d3b747). Priority 1 of the brief: soften the central division
further. NOTE on the brief itself: it carries three "lower body only" blocks and
two "arms only" blocks. The staged order at its end resolves them — arms are
phase 5, after the lower body — so this pass stays on the lower body and the arm
requirements are filed for phase 5, unstarted.

THE CENTRE WAS BEING MEASURED WRONG. Every previous pass judged it by the
GEOMETRIC valley (crown minus floor). Measured instead as the eye sees it — the
luma dip across the midline in the rendered clay, against the flanks at 40% out
— R247 read:

    row 210  15.2%      row 290  24.3%
    row 250  30.9%      row 330  22.0%

A 31% dip where the geometric valley is only 15% of the local depth. That gap is
why three successive geometric reductions kept coming back as "still reads as a
split": the visible line is driven by the SLOPE at the midline, not the depth,
and the two were being conflated.

THE CONTROL THAT WAS MISSING. R245 established that widening `head` fills the
centre but swamps the quad organisation riding on it, and the seam has only
0.007 of headroom left. Neither could soften the centre further. `bridge` is a
new lobe in astraQuad: a WIDE (half-width 0.62, against the seam's 0.40),
shallow positive dome on the midline. Because it is wider than the seam it
raises the whole inner flank rather than un-cutting the groove, and at 0.28 rad
it contributes 0.71 of its peak — so it lifts the floor faster than the crown.
It is a separate term, so `head` keeps its width and the quad keeps its
organisation.

`projection` 0.94 -> 0.870 is COMPENSATION, not slimming: the bridge lifts the
whole anterior including the crown, so the global scale is trimmed by exactly
what the crown gained.

RESULT at y 1.220
  floor          0.2390 -> 0.2549
  crown          0.2803 -> 0.2805     (held to a thousandth)
  valley         0.0413 -> 0.0256     (-38%)

VISIBLE centre-line dip, the metric that matters:
  row 210   15.2% -> 4.8%      row 290   24.3% -> 13.6%
  row 250   30.9% -> 18.0%     row 330   22.0% -> 10.3%
A 42-68% reduction in what the eye actually reads.

AND THE QUAD GOT BETTER, not worse: the RF/VL dip at y 1.220 went 0.015 -> 0.020,
because the bridge lifts the inner columns more than it lifts the crown. Quad
band adjacent-face max 65 -> 57, p99 60 -> 51.

GATES
  front / side outlines   zero pixels changed
  envelope                |x|max identical at every ring row 0.45-0.90
  knee band               51 max, p90 30 — unchanged (R247's phase-3 win holds)
  quad band               57 max — improved
  taper                   47 — unchanged; one fused point
  topology                12288 vertices, 4096 triangles
  BufferGeometry          0 non-finite, 0 degenerate, 0 non-unit normals
  Mrs. Mah                14 meshes IDENTICAL
  contracts               376/376

HONEST REMAINDER. At y 1.060 and 1.140 the valley is now 0.0120 and 0.0117 —
about 4.7% of the local depth. That is genuinely subtle, and it is close to the
floor of "a valley still exists". If the next review wants it quieter still, the
bridge is the control, but the bilateral read starts to go.

STAGED ORDER STATUS
  1 centre calming        R244, R246, R248 — this pass
  2 quad organisation     R245, R246 — holds, improved again here
  3 knee transition       R247 — holds
  4 shin / calf           R242 built the grammar; NOT advanced since
  5 arms                  NOT STARTED on either character, not measured at all
  6 shoulder / torso      NOT STARTED

R248 IS A CANDIDATE AND IS NOT USER-APPROVED. Fallback: A3, 28d1f04.

--------------------------------------------------------------------------------
R249 — STAGE A: THREE QUADRICEPS INFLUENCES INSIDE THE FUSED MASS
--------------------------------------------------------------------------------

The escalation brief's verdict on R248 was that the fused identity is preserved
and the remaining fault is UNDER-DEFINITION: one broad smooth upper mass plus one
generic taper. Measured on the built section that is literally true.

WHAT THE SECTION ACTUALLY WAS. At y 1.10 the anterior ran 0.257 / 0.265 / 0.278 /
0.293 / 0.296 / 0.267 / 0.179 — a single dome from the midline to x 0.098, then a
0.117 CLIFF (dz/dx -2.40) into an outer shelf at 0.186 that never recovers. One
mass, one gorge, one dead flank. No material or lighting change can put three
bellies on that.

TWO CAUSES, BOTH FIXED.

  RESOLUTION. The thigh carried 32 sides — EIGHT anterior sample columns from the
  midline to the flank — and `torsoAngle`'s front knots cluster three of them
  inside r 0.15, density authored for the sternum and the linea alba on a region
  whose midline is meant to be QUIET. The quad crown, the RF/VL boundary and the
  lateral sweep shared the remaining three. R105's lesson, unchanged: a belly
  needs vertices to be round, and no amplitude fixes resolution. The thigh band is
  48 sides now (body.js `sidesAt`), which is twelve anterior columns.

  ORGANISATION. `head` was 0.36 — it WAS the generic column — and `rf` sat at 0.34
  rad, inside head's own peak, so the two simply fused into one hump. `valley` was
  0.272 on a 0.22 rad half-width: a gorge, not a plane change. Now `head` 0.24
  supports the column instead of being it; `rf` moves out to 0.44 and gains
  amplitude; `valley` halves to 0.16-0.18 and widens to 0.30; `vl` grows to
  0.58-0.62 on a 0.52 half-width at 0.96, which lifts the outer shelf and lets the
  sweep wrap toward the side view; `vm` is carried at a restrained value through
  the whole thigh (a bridge plateau with nothing beside it is the flat medial
  table the first candidate showed at y 1.22-1.32).

  AND EACH BELLY PEAKS AT ITS OWN HEIGHT. The first build gave all three a flat
  plateau over y 0.95-1.23 and the clay showed three parallel RIDGES, not three
  volumes: two masses that swell at the same height meet in a vertical stripe.
  `rf` peaks at 1.10, `vl` HIGHER at 1.23-1.32, `vm` LOWER at 0.95, so every
  boundary runs diagonally.

THE SIDE PROFILE IS PINNED, NOT ESTIMATED. `depth` is re-solved so the CROWN depth
of every row equals R248's: 0.1569 against 0.1570 at y 0.87, 0.2978 at 1.10,
0.2897 at 1.23, 0.2477 at 1.32. X is owned by LOWER_WIDTH and was not touched.

MEASURED, matched clay captures, same camera / framing / lighting / material /
frozen pose:

  front outline          0 px changed, 992 lit rows
  side outline           0 px changed, 992 lit rows
  centre dip by row      210  4.8% -> 4.0%      250  18.0% -> 16.5%
                         290  13.6% -> 16.3%    330  10.3% -> 11.9%
  section plane changes  3 -> 5 (48-column section, y 0.95-1.32)
  the RF/VL cliff        dz/dx -2.40 -> -1.33
  outer shelf at y 1.10  0.186 -> 0.198
  knee band turns        max 51 (unchanged), p90 30 -> 31
  quad band turns        max 57 -> 59, p90 26 (was 26)
  triangles              173449 -> 173319, 29 draws
  Mrs. Mah               26 meshes, vertex hashes IDENTICAL to b63d0c7
  contracts              376/376

TWO THINGS FOUND ALONG THE WAY, BOTH WORTH KEEPING.

  `authoringMaster` IS OFF IN EVERY RENDERED SURFACE. Neither the lab nor the
  review page passes it, so `refineRecessEdges`, `conformSurfacePatch`
  (quadKneeSurfacePatch), `authorBodyMuscleCrowns` and the anatomical return
  regions DO NOT RUN in the mesh that is drawn. The scratch tools `vdump.mjs` and
  `kturn.mjs` build with `{authoringMaster:true}`, so they have been measuring a
  DIFFERENT mesh from the captures — its anterior columns are moved and some are
  consumed. For anything about the rendered lower body, `torsoSurface` sampled at
  the `torsoAngle` columns is the ground truth, and the captures are the arbiter.

  THE 48-SIDE BAND CANNOT REACH THE KNEE YET. Carried down to the 0.44 ring,
  `quadKneeSurfacePatch` fails outright — "Could not recover cage edge
  [0.064,0.90]-[0.129,0.79]" — against the denser rings; carried to 0.78 the new
  stitch lands inside the knee band and took its p90 turn 30 -> 34. The boundary
  is 0.92, above the patch. The knee's topology is Stage B's to change.

HONEST REMAINDER.
  - The centre is BETTER at the two upper rows and WORSE at the two lower ones
    (290: 13.6 -> 16.3, 330: 10.3 -> 11.9). `bridge` was extended down to y 0.87
    to pay for the new medial mass and it recovered only part of it. If the review
    wants those rows quieter, `bridge` is still the control and it is still
    monotone: zeroing it takes the dip to 13.2 / 29.9 / 22.6 / 21.1.
  - In the THREE-QUARTER the vastus lateralis now reads clearly as a wrapping
    mass. In the FRONT the three influences are readable but not emphatic.
  - The largest untaken lever is the SAMPLE DISTRIBUTION: four of the twelve
    columns still sit inside r 0.15 on a midline that is supposed to be quiet.
    Redistributing `torsoAngle`'s front knots for the thigh band would give every
    belly ~50% more samples and make them rounder rather than deeper — better
    curvature, not more amplitude. It touches a function shared with the whole
    male torso, so it was NOT done in the same pass as a topology change.
  - Knee (Stage B) and shin/calf (Stage C) are untouched. The angular streaks
    near the knee are present in R248 and R249 alike.

STAGED ORDER STATUS
  1 centre calming        R244, R246, R248 — mixed here, see remainder
  2 quad organisation     R249 — this pass
  3 knee transition       R247 — holds, NOT advanced
  4 shin / calf           R242 built the grammar; NOT advanced since
  5 arms                  NOT STARTED on either character, not measured at all
  6 shoulder / torso      NOT STARTED

R249 IS A CANDIDATE AND IS NOT USER-APPROVED. Fallback: R248, b63d0c7.

--------------------------------------------------------------------------------
R250 — MD-PAL PASS 1: CENTRE LINE AND UPPER-HALF SIDE PROFILE
--------------------------------------------------------------------------------

MEASURE. Depth over width on the runtime mesh: 1.36 at y 0.87, 1.62-1.66 through
the thigh, then 1.86 at y 1.45 and 2.03 at 1.48. Mrs. Mah — the protocol's own
quality reference for this shape — falls the other way over the same rows, 1.48
-> 1.46. Front z fell 0.2820 (y 1.22) to 0.2095 (1.40) and then RE-SWELLED to
0.2432 and 0.2668 while the width was still falling: a step, not a taper.

DIAGNOSE. Two owners, and both were isolated rather than argued.
  - The bulb over y 1.15-1.40 is the lower body's own depth, and it is where the
    "too thick from the side" reads.
  - The step at y 1.42-1.50 is NOT the lower body's. Above ~1.42 `astraWeight` is
    zero and the front is `connectedFront`, i.e. the torso's
    `pec.surface.supportDepth` (0.228 at 1.40, 0.236 at 1.48) arriving over a
    lower body that reaches 0.187. Zeroing `lowerWall` moved y 1.48 by 0.001 and
    zeroing `coreField` by 0.002 — neither owns it. That 26% step is the torso's
    support surface and belongs to Pass 4.

ADJUST. A graded 5% depth trim: full from y 1.23 up, zero at 1.06 and below, on
BOTH contours — anterior through the astraQuad `depth` solve, posterior through
LOWER_BACK — because taking only the front would move the mass backward instead
of slimming it. And `bridge` rises 0.28 -> 0.32 at its peak so the centre does
not come back with the reduced depth.

LOCK, matched clay, same camera / framing / lighting / material / frozen pose:

  centre dip by row      R248            R249            R250
    210                  4.8%            4.0%            2.9%
    250                 18.0%           16.5%           13.2%
    290                 13.6%           16.3%           13.1%
    330                 10.3%           11.9%            9.5%
  depth/width y1.14      1.644           1.644           1.613
  depth/width y1.22      1.630           1.630           1.559
  depth/width y1.34      1.633           1.633           1.560
  depth/width y0.87      1.356           1.356           1.355   (held, by design)
  front outline          IDENTICAL to 0.000 px on every outline row (geometry)
  side outline           mean 0.66 / 0.50 px, worst 4 px over the lower body
  Mrs. Mah               26 meshes, vertex hashes IDENTICAL to b63d0c7
  contracts              376/376

R250 IS THE FIRST PASS WHOSE CENTRE IS QUIETER THAN R248 AT EVERY MEASURED ROW
while carrying R249's quad organisation.

A TOOL CORRECTION THAT INVALIDATES AN EARLIER CLAIM. `silhcmp.mjs` finds the
leftmost and rightmost pixel above luma 40, and the review stage draws a 1-PIXEL
BORDER at luma 43.3 down columns 0 and W-1. So every row reported "lit" from 0 to
871 and every comparison it was ever given answered "0 px changed" — including
the "front and side outlines 0 px" lines recorded for R248 and R249. Those lines
were vacuous. `silh2.mjs` excludes a 4px margin, and the front silhouette is now
settled from GEOMETRY instead: max |x| per row, built mesh, R248 against R250 —
every outline row (width > 0.15) identical to 0.000 px. The 14-16 px worst-row
difference the corrected image tool reports at rows 546-550 is the shaded right
flank crossing the luma threshold, not a silhouette move: the lit left edge is
identical at every row and LOWER_WIDTH was never touched.

STILL OPEN AFTER PASS 1-2
  - The y 1.42-1.50 step (torso support surface) — Pass 4.
  - From the side the lower two thirds is still a plain straight cone: no knee,
    no shin, no calf event. That is Pass 3 and it is the largest remaining gap.
  - The front read of the three quad influences is present but not emphatic. The
    untaken lever is `torsoAngle`'s front knots: four of twelve thigh columns
    still sit inside r 0.15, on a midline that is meant to be quiet.
  - Torso bumpiness (Pass 4) and arms (Pass 5) not started, not measured.

R250 IS A CANDIDATE AND IS NOT USER-APPROVED. Fallback: R249 813c5cd, then R248
b63d0c7.

--------------------------------------------------------------------------------
R251 — ANATOMICAL OWNERSHIP: EVERY ANTERIOR TERM IS A NAMED MUSCLE
--------------------------------------------------------------------------------

The brief's rule: any relief that cannot be named is a defect. Four controls
could not be named and are REMOVED, not reduced.

  `head`    a generic thigh-column roundness (0.36 at its peak) — it was most of
            the anterior and every muscle rode on it as a ripple.
  `bridge`  a dome on the midline that filled the channel back in (R248-R250).
  `seam`    an authored central descent — a groove cut on the midline.
  `notch`   the same control one segment down, on the anterior lower leg.

THE CENTRAL VALLEY IS NOW A CONSEQUENCE. `rf` sits 0.44 rad off the midline on a
0.64 half-width, so each rectus belly's tail crosses the seam and the mirrored
pair overlaps there at 0.765 of its own crown. Nothing subtracts on the midline
any more. Likewise on the shin: `shins` (tibialis anterior) goes from a 0.30 to
a 0.55 half-width and its pair overlaps at 0.38, so the shin's centre channel is
the gap between the two ridges.

WHAT REMAINS, AND WHAT EACH OWNS
  rf      RECTUS FEMORIS      centre 0.44  hw 0.64  peak 0.52 at y 1.10
  vl      VASTUS LATERALIS    centre 0.98  hw 0.50  peak 0.66 at y 1.23
  vm      VASTUS MEDIALIS     centre 0.26  hw 0.30  peak 0.32 at y 0.95
  valley  RF/VL boundary      centre 0.74  hw 0.28  peak 0.22
  itb     iliotibial flat     centre 1.95  hw 0.30
  shins   TIBIALIS ANTERIOR / pit POPLITEAL / tendon ACHILLES / hollow / soleus
  caps    the patellae, held at ZERO (R242: swapping it against `shins` across
          one ring put a 59 degree row seam at y 0.827)

THE GLUTE OWNS THE POSTERIOR PROJECTION. R250's side read was inverted against
the brief — at y 1.22 the anterior was 0.2684 and the posterior 0.2274, so the
front of the pelvis/upper thigh was the dominant mass. LOWER_BACK comes up at
the glute rows and astraQuad's `depth` comes down by the same amount, so the
hierarchy inverts without the side getting thicker.

  rear / front           R250    R251
    y 1.14               0.829   0.837   (anterior quad's own peak — correct)
    y 1.22               0.847   1.036
    y 1.28               1.037   1.104
    y 1.34               1.066   1.116
  glute peak vs pelvis   1.42x   1.50x
  depth / width y1.22    1.559   1.536   (R248 1.630)
  depth / width y0.87    1.355   1.356   (knee approach, held by design)
  total depth y1.22      0.4959  0.4885  (it did not swell)

  centre dip by row      R248    R250    R251
    210                  4.8%    2.9%    0.7%
    250                 18.0%   13.2%    3.7%
    290                 13.6%   13.1%    2.8%
    330                 10.3%    9.5%    4.7%

  Mrs. Mah               26 meshes, vertex hashes IDENTICAL to b63d0c7
  contracts              376/376

WHAT DID NOT IMPROVE, HONESTLY.
  - THE FRONT QUAD READ IS LESS EMPHATIC THAN R250'S. The quiet centre was
    bought with a wide rectus, and a wide rectus is a flatter one. In the
    three-quarter the vastus lateralis reads better than it ever has — it is a
    mass with a boundary now, not a stripe — but front-on the three influences
    are softer than the pass before. That is the trade the brief asks for
    ("success is NOT more definition"), and it is still a cost.
  - THE KNEE DOES NOT READ. Section 5 is not achieved. The dark chevron at the
    distal quad is present in R248, R250 and R251 alike and is unchanged; there
    is no narrowing, no patellar plane, no plane change. `caps` is still zero.
  - SHIN AND CALF ARE MARGINAL. Removing `notch` and widening the tibialis is
    the right ownership, but at 2-5% of the local radius the read is barely
    above the surface noise floor.
  - The y 1.42-1.50 anterior step is still the torso's `pec.surface.supportDepth`
    arriving over the lower body. Untouched, as before.

R251 IS A CANDIDATE AND IS NOT USER-APPROVED. Fallback: R250 3eb833d, then R249
813c5cd, then R248 b63d0c7.

--------------------------------------------------------------------------------
R252 — STANDARD-SIZE NORMALIZATION, PASSES 1-7 OF THE MD-PAL LADDER
--------------------------------------------------------------------------------

THE LANDMARK AUTHORITY WAS IN THE REPOSITORY ALL ALONG.
`reference/handoff/MAHWORLD_Teardrop_Anatomy_Reference_Sheet.png` — the MUSCLE
MAP -> TEARDROP FLOW panel — colour-codes every lower-body mass onto the teardrop
and states the species rules outright: "QUADS FEED DIRECTLY INTO TEARDROP",
"ADDUCTORS BLEND INTO CENTER LINE", "HAMSTRINGS WRAP TO REAR", "CALVES MERGE
CLEANLY INTO POINT". Measured off it (teardrop top t 0, point t 1):

  quads        t 0.13 - 0.56      world y 1.33 -> 0.673
  calf group   t 0.56 - 0.77      world y 0.673 -> 0.352
  taper        t 0.77 - 1.00      world y 0.352 -> 0

§14 AUDIT, measured on the built RUNTIME mesh against that:

  head 0.366 hw                CORRECT (locked by the R101 head law)
  neck 0.31 head-widths        CORRECT
  waist / abdomen / pelvis     CORRECT (0.63 / 0.91 / 0.60)
  upper arms  x-span 0.391     TOO LARGE     (Pass 9, not started)
  forearms    x-span 0.236     TOO LARGE     (Pass 9, not started)
  torso surface                see brief §11 TOO ROCKY (Pass 10, not started)
  glutes                       SLIGHTLY LARGE - corrected here
  upper thigh / anterior quad  TOO LARGE     - corrected here
  rectus femoris               CORRECT
  vastus lateralis             CORRECT
  vastus medialis              SLIGHTLY SMALL - corrected here
  ADDUCTOR                     ABSENT        - added here
  HAMSTRING                    ABSENT        - added here
  KNEE                         WRONG PLACE   - 0.80/0.87 against a canon of 0.673
  tibialis                     TOO SMALL     - raised here
  gastrocnemius                ABSENT        - added here (pit and hollow are
                               both SUBTRACTIVE and soleus was 2%, so nothing in
                               that table was building a calf at all)
  soleus                       NEARLY ABSENT - raised here
  terminal taper               CORRECT

WHAT CHANGED
  - astraQuad region 0.80 -> 0.66 with a 0.10 fade. The quad reaches the
    canonical knee at 0.673 instead of stopping a seventh of the lower body
    above it, and rf / vl / vm / valley / itb all gained distal knots.
  - `add` — THE ADDUCTOR GROUP, the centre line's owner per the sheet. A single
    dome ON the midline, which is exactly the shape `bridge` was, except that
    this one is a muscle.
  - `lower.posterior` — THE HAMSTRINGS. `bicepsFemoris` at 0.50 rad off the rear
    seam, `medialHam` at 0.22, no authored groove between them. This build had
    NO posterior thigh term at all, which is why the glute read as a sphere:
    there was nothing below it for it to become.
  - astraLowerLeg region 0.14-0.98 -> 0.12-0.82, amplitudes roughly doubled, and
    `gastroc` added as a named rear/rear-lateral mass.
  - LOWER_BACK comes DOWN at every glute row (0.2225 -> 0.2080, 0.2018 ->
    0.1930, 0.176 -> 0.163, 0.153 -> 0.144): the hamstring is paid for out of the
    generic profile under it, not added on top.
  - astraQuad `depth` re-solved twice so the anterior gives back exactly what the
    adductor and the extended quad added, and then 8% more at the belly rows —
    the brief's first REDUCE item.

MEASURED

  depth / width          R248    R251    R252        rear / front   R251   R252
    y 0.87               1.356   1.356   1.418         y 0.97       0.75   0.82
    y 0.97               1.545   1.587   1.597         y 1.06       0.76   0.82
    y 1.06               1.618   1.640   1.636         y 1.14       0.84   0.99
    y 1.14               1.644   1.632   1.636         y 1.22       1.04   1.10
    y 1.22               1.630   1.536   1.530         y 1.28       1.10   1.07
    y 1.28               1.662   1.540   1.485         y 1.34       1.12   1.08
    y 1.34               1.633   1.528   1.484
    y 1.40               1.625   1.554   1.513

  centre dip by row      R248     R251     R252
    210                  4.8%     0.7%    -0.6%
    250                 18.0%     3.7%     0.8%
    290                 13.6%     2.8%    -2.3%
    330                 10.3%     4.7%     2.8%

  Mrs. Mah   26 meshes, vertex hashes IDENTICAL to b63d0c7
  contracts  376/376        triangles 173178, 29 draws

THE ADDUCTOR'S FIRST AMPLITUDE WAS WRONG BY A FACTOR OF THREE AND ONLY THE
RENDER SAID SO. At a 0.16 peak the centre dip went to minus 6 to minus 8 per
cent — the midline BRIGHTER than the flanks, i.e. a central ridge, the one thing
sections 4 and 9 rule out. It adds its whole coefficient at the seam and nothing
at the rectus crown, so it moves the dip almost one-for-one: about 0.8 points per
0.01. It is 0.05.

TWO TOOL FACTS WORTH KEEPING
  - `tests/mrmah3d.test.js` reads every source as TEXT and never imports it, so
    376/376 passed twice in this pass over a proportions.js with a SYNTAX ERROR
    in it. A green suite is not evidence that the module loads. The capture is.
  - The static server on 8123 dies between passes; a capture that ends in a bare
    "Node.js v22.22.2" is ERR_CONNECTION_REFUSED, not a render fault.

STILL OPEN
  - THE DARK CHEVRON at the distal quad is unchanged and is present identically
    in R248. `lowerField`'s own `kneeAccent` is a POSITIVE 0.012 bump centred at
    y 0.70 + 0.14q (0.75 at its lateral centre), so it is not the chevron's
    owner. Next pass should isolate it before touching anything near the knee.
  - Passes 9-12 (shoulders/arms, torso rockiness, sculpt-guide comparison, the
    two characters side by side) are NOT STARTED and are not measured beyond the
    x-spans in the audit above.
  - The y 1.42-1.50 anterior step is still the torso's support surface.

R252 IS A CANDIDATE AND IS NOT USER-APPROVED. Fallback: R251 f4f37f2, then R250
3eb833d.

--------------------------------------------------------------------------------
R253 — PHASE A: THE SIDE PROFILE'S MASS MOVES DOWN THE CHAIN
--------------------------------------------------------------------------------

THE DEFECT, MEASURED. The anterior fell 0.2231 at y 0.97 to 0.1565 at y 0.87 —
THIRTY PER CENT ACROSS ONE 0.10 BAND — and then ran as a plain cone to the point.
That step is the "large upper bulb / empty long cone".

AND A DEAD-CODE FINDING THAT EXPLAINS WHY R252's DISTAL KNOTS DID NOTHING. The
astraQuad region was [0.66, 1.46, 0.10]: `windowAt` fades IN across 0.66-0.76, so
the weight AT 0.66 is exactly zero. Every distal coefficient R252 added at y 0.66
was multiplied by nothing. The region starts at 0.58 now.

THE CORRECTION IS BOUNDED AND IN BOTH DIRECTIONS — the brief's 15-30% band for a
clear large error, applied as a REDISTRIBUTION rather than a trim:

  anterior          R252     R253            posterior        R252     R253
    y 0.66         0.1269   0.1343  +6%        y 0.66        0.1010   0.1104  +9%
    y 0.77         0.1397   0.1643 +18%        y 0.77        0.1217   0.1384 +14%
    y 0.87         0.1565   0.1800 +15%        y 0.87        0.1533   0.1704 +11%
    y 0.97         0.2231   0.2050  -8%        y 0.97        0.1820   0.1962  +8%
    y 1.06         0.2544   0.2273 -11%        y 1.22        0.2546   0.2491  -2%
    y 1.14         0.2515   0.2243 -11%
    y 1.22         0.2318   0.2094 -10%

  depth / width      R248            R253
    y 0.66           1.484           1.639      the distal chain now carries depth
    y 0.87           1.356           1.603
    y 1.14           1.644           1.541
    y 1.28           1.662           1.413      the bulb is 15% down on R248
    y 1.34           1.633           1.431

  centre dip by row  0.4 / 1.1 / -3.7 / 0.1 / -0.6 / -2.9 per cent — subordinate
  mask half-width at rows 370 / 410:  54 / 43  ->  93 / 80. The lower leg is
  reading as a lit mass for the first time rather than as an unlit spike.

  Mrs. Mah  26 meshes IDENTICAL to b63d0c7      contracts 376/376

  (An earlier "MRS CHANGED" line in this session was an EMPTY hash file from a
  background chain that raced the diff, not a regression. Check `wc -l` on a
  hash file before believing a difference.)

--------------------------------------------------------------------------------
PHASE B OPENED — THE ARM DIAGNOSIS, MEASURED
--------------------------------------------------------------------------------

`armprof.mjs` bins each arm mesh along its own principal axis and reports the
mean radius per bin. Normalised, from the shoulder end down:

  arm-right-upper  0.36 0.78 0.95 0.96 0.81 0.87 0.84 1.00 0.87 0.91 0.78 0.67 0.48 0.41
  arm-right-fore   0.62 0.88 0.92 0.98 0.93 0.77 0.90 0.84 1.00 0.81 0.47 0.47 0.51 0.30
  arm-left-fore    0.23 0.33 0.51 0.61 0.65 0.69 0.86 0.92 1.00 0.98 0.98 0.85 0.65 0.42

The upper arm has THREE local maxima (0.96, 1.00, 0.91) separated by two dips of
15-19%, and the lowered forearm has three more. That is the "ball + oval + oval +
cone" read, and it is now a number rather than an impression. The raised forearm
(arm-left-fore) is the counter-example: one belly, monotone either side — which
is what all four segments should look like.

NOT STARTED: the correction itself, Phase C (torso), D (Mrs. comparative), E
(crystallisation), F (hair), G (final consistency).

R253 IS A CANDIDATE AND IS NOT USER-APPROVED. Fallback: R252 ba3c931.

--------------------------------------------------------------------------------
R254 — THE CHEVRON WAS THE STITCH, AND THE REAR HAD NEVER BEEN RENDERED
--------------------------------------------------------------------------------

TWO SECTION-31 ITEMS CLOSED, BOTH BY LOOKING AT SOMETHING THAT HAD NEVER BEEN
LOOKED AT.

1. THE DARK CHEVRON AT THE KNEE WAS THE SIDE-COUNT STITCH. It survived R249
   through R253 and every diagnosis of it had been aimed at the anatomy fields.
   It was topology: `sidesAt` changed 32 -> 48 at y 0.92, so `loft`'s
   differing-density stitch ran its triangle fan across y 0.87-0.97 — the knee
   band the render actually shows.

   AND THE CONSTRAINT THAT PUT IT THERE WAS NOT REAL. R249 set the boundary at
   0.92 because carrying 48 to the 0.44 ring made `quadKneeSurfacePatch` fail its
   cage recovery. That function is inside `if(options.authoringMaster===true)`,
   and neither the lab nor the review page sets it — IT NEVER RUNS IN THE MESH
   THAT IS DRAWN. A visible artifact was being protected by a function with no
   presence in the product. The boundary is 1.10 now: the quad belly keeps its
   twelve anterior columns, the stitch lands in the smooth mid-thigh, and the
   chevron is gone from the capture.

   The knee band is back to eight anterior columns. That is the trade, and
   continuity won it: section 31 rejects knee artifacts, not knee resolution.

2. THE REAR HAD NEVER BEEN CAPTURED IN THIS ENTIRE PROGRAMME. Hamstrings, a
   glute-ham handoff and a gastrocnemius were all authored and reported on
   without one rear render. `caprear.mjs` adds lower-rear, lower-rear-3/4,
   quad-rear and full-rear on the same camera contract.

   What it showed: the glutes are sound — two masses, a shallow cleft, no shelf
   and no bubble-on-spike. But a CONTINUOUS DARK STRIPE ran the whole taper —
   section 5's "long dark stripe", on the face nobody had checked. Two owners,
   both arithmetic:
     - `medialHam` at 0.22 rad on a 0.30 half-width overlaps on the rear seam at
       0.63 of its own crown: a 37% valley, authored by accident. At 0.34 it is
       0.83 — a 17% valley, which is a groove between two muscles rather than a
       seam. (The same overlap arithmetic as the rectus pair and the tibialis.)
     - `lowerField`'s glute cleft ran `windowAt(y,1.03,1.48)` — 0.12 further down
       than the glutes themselves, into the hamstring rows, forming the top of
       one uninterrupted line. It starts at 1.15 now.

  centre dip by row   0.4 / 1.4 / -3.2 / -1.1 / -3.0 / -2.9 per cent
  triangles           172812, 29 draws
  Mrs. Mah            26 meshes IDENTICAL to b63d0c7      contracts 376/376

PHASE A (LOWER BODY) IS LOCKED AT ~90% PER SECTION 14. Remaining and carried
forward rather than blocking: the rear midline is softer but still visible along
the taper; anatomy-following crystal planes are Phase E.

NEXT: PHASE B, ARMS. Diagnosis already measured (R253 entry): the upper arm has
three local maxima separated by 15-19% dips; the raised forearm is the
counter-example with one belly and a monotone taper either side.

R254 IS A CANDIDATE AND IS NOT USER-APPROVED. Fallback: R253 07a3f80.

--------------------------------------------------------------------------------
R255 — PHASE B: THE ELBOW BALL WAS SIZED FROM THE WRONG PROFILE
--------------------------------------------------------------------------------

FIRST, THE THING THAT IS NOT WRONG. `maleUpperShape` is not a primitive: it
already authors a biceps with a footprint taper, a triceps long head and lateral
head on their own axes, a brachialis wedge with asymmetric returns, intermuscular
septa and a distal tendon. The anatomy IS in the runtime path. The "stacked
capsules" read is not missing muscle.

WHAT IS WRONG IS THE JOINT SIZING, and it is a plain bug.

  var eR = spec.foreRadius * ARMS_.profiles.fore(0) * (1 + .12*(1-bendK));

`ARMS_.profiles.fore` is the GENERIC profile and returns 0.77 at the root. The
male forearm is not lofted with it — it is lofted with `maleForeProfile`, whose
pose-burial term takes the root to 0.524 on a straight elbow. So the ball was
sized from a function the tube does not use:

  upper arm distal 0.1201  ->  BALL 0.0862  ->  forearm root 0.0586  ->  belly 0.098

The ball stood at 1.47x the tube it emerges into. That is section 16's "tiny neck
between two balloons", measured, and it is what reads as a bead on a string.

FIXED TWO WAYS, BOTH BOUNDED AND RUNTIME-ONLY:
  - the ball takes `maleForeProfile` — the same function the forearm is built
    with — so it is flush with that tube's own root by construction, in any pose;
  - the root burial comes 0.32 -> 0.18 so the forearm RE-EXPANDS out of the joint
    instead of pinching first and blooming later.

  new chain   upper 0.1201 -> ball 0.0707 -> root 0.0707 -> belly 0.1120 -> wrist 0.065
  forearm     0.071 0.089 0.107 0.111 0.112 0.108 0.103 0.094 0.085 0.075 0.065
              one belly, monotone either side — section 17's shape.

AND A SHARED-CODE LEAK THAT SECTION 0 NAMES EXPLICITLY. The first cut moved MRS.
MAH: her proportion set carries `maleAnatomy === true` on purpose (her arms come
through this same path and are then sculpted by her own R166 refiners), so an
edit gated on `maleAnatomy` reaches her. Gating on `legacyArms` — the existing
R166-retained view she already carries — fixed the elbow solids but NOT her
forearm, because `maleForeProfile` has TWO INTERNAL CALLERS inside
arm-anatomy.js (`maleForePlanes`, `maleWristSurface`) that passed only
(t, straightness), so the new default reached her through them. Both now take
and forward `legacy`.

  Verified by hash, not by inspection: Mrs. Mah 26 meshes IDENTICAL to b63d0c7.
  contracts 376/376    triangles 172812

STANDING LESSON: when adding a parameter to a shared limb function, grep for
INTERNAL callers in the same module before believing a call-site gate. A default
argument is a silent propagation channel, and `maleAnatomy` is not a character
discriminator on this project — `legacyArms` is.

STILL OPEN IN PHASE B: the deltoid cap's sphericality, the biceps/triceps
territory split in the side view, and the forearm's flexor/extensor asymmetry are
NOT yet addressed. The improvement here is at the elbow only, and it is modest at
full-character distance.

R255 IS A CANDIDATE AND IS NOT USER-APPROVED. Fallback: R254 2f36747.

--------------------------------------------------------------------------------
R256 — DELTOID CAP: ATTEMPTED, REVERTED, AND THE OWNER IS NOT THE PROFILE
--------------------------------------------------------------------------------

MEASURED FIRST, AND THE MEASUREMENT WAS RIGHT. `maleShoulderArm`'s cap profile is
`.945*(.015+.985*sin((h+.40)/.40*pi/2)^.48)`, and at exponent 0.48 that tracks a
TRUE HEMISPHERE of the same radius to within 2-4% at every height (0.845 against
0.866 at mid-cap). The cap really is a sphere, which is section 15's "ball
attached to the torso" as arithmetic rather than as an impression.

THE CHANGE WAS SOUND AND THE GATE REFUSED IT. At 0.66 the upper dome comes in
6-19% while h=0 — the shoulder LINE and therefore the front-view shoulder width —
is unchanged to four decimals. Tests passed. Mrs. Mah hashed identical. The male
built without throwing in Node. And the review page then would not mount:

  R185 scoped muscle volume exceeded
    {delta: 0.101, h: -0.223, a: 1.797, r: 0.0917,
     target: {radius: 0.1932, owner: "LATERAL_DELTOID"}}

THE CAP'S RADIUS IS OWNED BY R185's SCOPED MUSCLE-VOLUME SYSTEM, NOT BY THIS
EXPONENT. Narrowing the profile drops the surface inside the authored
LATERAL_DELTOID envelope and its safety gate throws rather than sculpt a shape it
does not recognise — the same class of guard as Mrs. Mah's `mrs-shoulder-*`
returns. Reverted; the scene mounts again in 43s and the tree is clean at R255.

TWO THINGS THIS ESTABLISHES.

  1. THE DELTOID CANNOT BE RESHAPED FROM THE PROFILE ALONE. Any real change to
     the shoulder cap has to move the R185 volume targets WITH it, and those are
     an authored, gated system covering the whole deltoid region. That is a
     scope expansion, not a bounded regional edit, and section 33 stops for it.

  2. A NODE BUILD IS NOT A MOUNT TEST. `buildLimbs` in a Node harness completed
     without throwing while the browser refused to mount, because the volume
     gate runs in a path the harness does not reach. Three separate checks —
     376/376 contracts, an offline male build, and Mrs. Mah's hashes — all passed
     over a build that could not render. The mount check (`mountcheck.mjs`,
     scratch) is the cheap one that actually catches this, and a capture that
     hangs before its first "captured" line IS a mount failure, not a slow
     render.

PHASE B STATUS: the elbow (R255) is done and kept. The DELTOID is blocked on the
scope question above. The biceps/triceps side-view territory split and the
forearm's flexor/extensor asymmetry are untouched and are NOT blocked — they live
in `maleUpperShape` / `maleForeShape`, which are not volume-gated.

HEAD OF BRANCH REMAINS R255 fd2d96b.

--------------------------------------------------------------------------------
CORRECTION — `authoringMaster` IS ON IN THE RENDER. R249-R255 SAID OTHERWISE.
--------------------------------------------------------------------------------

`mrmah3d/core/character.js:31`

    authoringMaster: opts.authoringMaster !== false

IT DEFAULTS TO TRUE, and its own comment says so: "DEFAULT ON here so the lab and
the review viewer show the accepted character rather than the stock pipeline".
I read `opts.authoringMaster` in mrmah.js, saw that neither the lab nor the review
page sets it, and concluded it was off — missing this defaulting layer between
`mrmah-scene.js` and `mrmah.js`. Verified the right way in the end, by logging
from inside a mounted page: `authoringMaster= true name= male authoring= true`.

WHAT THAT INVALIDATES, EXPLICITLY.

  R249 / R254 — "quadKneeSurfacePatch never runs in the mesh that is drawn", and
  the claim that R249's 0.92 side-count boundary was protecting a function with
  no presence in the product. WRONG: it does run. The R249 constraint was real.
  The chevron fix itself STANDS — the capture shows the chevron gone and the
  scene mounts, so the 1.10 boundary satisfies the cage — but it was kept for a
  reason that was not true, and the risk I claimed was absent was actually there.

  R255 — "the arms look like stacked ovals because the anatomy authored for them
  is not running". WRONG. The elbow-ball bug is still real and the fix still
  valid (`maleForeProfile` feeds the loft, upstream of the authoring pass, and
  the capture shows the bead gone), but the diagnosis framing around it was not.
  The two `armprof` profiles I compared were a no-flag Node build against a
  flagged one; the browser renders the flagged one, so the "runtime vs authoring"
  contrast I drew was between two builds, one of which nothing renders.

  R249-R253 MEASUREMENTS. `profile.mjs`, `vdump-runtime.mjs` and `armprof.mjs`
  all call `buildBody`/`buildLimbs` with `{}`, which does NOT pass through
  character.js's defaulting, so they measured the stock pipeline. Same rows, both
  builds:

     y      front (no auth / auth)     rear (no auth / auth)    d/w (no auth / auth)
    0.97      0.2050  /  0.1925          0.1964 / 0.2202          1.583 / 1.627
    1.14      0.2243  /  0.2165          0.2483 / 0.2528          1.548 / 1.537
    1.28      0.1998  /  0.1979          0.2263 / 0.2575          1.413 / 1.510

  The REAR is understated by up to 14% and depth/width by up to 0.10. Direction
  and sign of every reported change hold; the absolute values in R249-R255 do
  not. Every KEEP decision was ultimately made on a CAPTURE, and the captures
  were always the product build, so the conclusions stand.

TOOL RULE FROM NOW ON: any harness that measures geometry must pass
`{authoringMaster:true}` explicitly, because it is bypassing the layer that would
have defaulted it. A bare `{}` measures a build nothing renders.

AND THE MOUNT CHECK IS NOT OPTIONAL. R256 passed 376/376 contracts, an offline
male build and Mrs. Mah's hashes over a build that could not mount. The gate that
caught it (`authorMuscleBellies`, R185 scoped volume) lives in exactly the layer
I had written off. `mountcheck.mjs` runs in ~45s and is now the check that goes
between the tests and any capture.

HEAD OF BRANCH REMAINS R255 fd2d96b (geometry unchanged by this entry).
