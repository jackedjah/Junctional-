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
