# MRS. MAH — CURRENT STATE

MASTER REFERENCE:
Supplied Mrs. Mah best render and sculpt guide at references/user-muscle-true-fileset/MAH_R166_LOWER_BODY_MUSCLE_TRUE_CRYSTAL_FILESET/04_REFERENCES/MRS_MAH_SCULPT_GUIDE.jpeg. Read MRS_MAH_MASTER.md first.

ACCEPTED BASE:
R166-M47-6217c80f7b5f, parent M44-bddf9c9cdbff. Exact source: C:/Users/jahsu/Documents/Codex/2026-09-06/mrs-mah/snapshots/R166-M47/character
101/101 hashes verified;170 checks pass. Local PAL acceptance, not full master-reference closure.

ACTIVE REGION:
Knee-to-calf landmarks within fused teardrop; posterior calf belly improved.

MASTERED / LOCKED:
- Head/face, arms/hands, torso, abdomen, narrow waist, hip/thigh dimensions and materials unchanged by this pass.
- Anterior geometry including insertion valleys exactly M44.
- Terminal point and fusion preserved; closed oriented skin verified.
- M44 upper planes and posterior anatomy retained, plus M47 posterior calf projection.

REGRESSED / RECOVERY NEEDED:
- M46 valley softening remains excluded; never resume from M46.
- M47 study-a REJECTED: circumferential calf/knee band. Study-b retained posterior-only shape.
- Guide mismatch OPEN: knee landmark carving and broader crystalline anatomy still weaker than master. No global parity claim.
- Startup M40/M44 comparison found M44 stronger in distal planes; no further historical rollback justified there. No new regression in locked regions detected.

CURRENT DEFECT:
Knee-to-calf macro architecture remains weaker than the guide. M48–M52 local grooves, bumps, contour contraction and plane compression did not solve it. Shared-coordinate testing found no cross-owner cause for the M52 region. Do not repeat this family of small deformations.

LATEST EVIDENCE:
- evidence/R166-M52/REVIEW.json and study-a: shared-coordinate compression rejected after regional 3Q/full front clay comparison; protected positions/attributes unchanged in prototype. No native rebuild needed after visual failure.
- evidence/R166-M51/REVIEW.json: direct taper-owner plane study rejected. First version creased; feathered revision passed prototype safety but failed visual acceptance. M47 remains unchanged, 101/101 hashes verified.
- evidence/R166-M50/REVIEW.json and study-a/study-b: both added-volume approaches rejected after regional clay comparison. 101/101 M47 hashes verified before authoring.
- evidence/R166-M48/REVIEW.json: both recess studies rejected; no new retained checkpoint. Startup verified 101/101 hashes and exact current presentation.
- evidence/R166-M47/REVIEW.json, actual-checks.json, source-a, study-b
- Five paired regional clay views and full/native regional/full material/clay inspected.
- 170 checks: anterior exact, materials exact, pose restoration exact, joined skin one closed component, zero topology faults.
- implementation/mrsmah-latest-interactive.html updated to actual M47 with drag rotation and calf focus.

NEXT ACTION:
Compare the front knee-to-calf width profile with the sculpt guide and identify the missing macro silhouette relationship before further editing. Test a different anatomical construction only if that comparison supports it. Preserve M47 posterior calf, thigh valleys and terminal fusion. No further local knee compression/bump/groove variants.

ANTI-REGRESSION NOTE:
Never fill thigh/adductor or abdominal valleys. Do not reapply M46 quadratic support, M45 insertion bulges, or M47 study-a ring shaping. Preserve local valleys and broad planes. Topology checks alone cannot justify retention. Newest is not automatically best.

M48 ANTI-REGRESSION: neither deep nor shallow oblique line recess established knee anatomy. Both remain excluded. Numerical triangle safety did not justify retaining them.

M49 REVIEW — UNRETAINED:
Lateral-only knee contour studies completed. Native source build passes 171 checks; closed oriented skin, unchanged Y/Z, protected geometry and materials verified. Full-figure improvement is insufficient to establish knee anatomy. Keep M47 as accepted base. Evidence: evidence/R166-M49/REVIEW.json, actual-checks.json, source-a, study-b. Do not resume M49 as accepted geometry. NEXT: integrated knee volume/plane transition from M47, not another contour-only contraction.


---

R232 RECONSTRUCTION + THE WIDTH-PROFILE COMPARISON (this repository)

ACCEPTED BASE: R166-M47-6217c80f7b5f, reconstructed into the one renderer.
Mounted as createMrMah({variant:'mrs-mah'}), or the scene entry's
{variant:'mrs-mah'}. Builds at 125,789 triangles across 44 meshes (126,588
rendered), 149 seconds of CPU for her 87 regional refiners, 41 draw calls,
1.20 ms/frame at the low tier. Her hero pose is present and reachable.

WHAT THE RECONSTRUCTION HAD TO DO TO PRESERVE HER. Her handoff and Mr. Mah's
are two divergent builds of one package, and his is the later shared base. Two
things of hers would otherwise have been lost:

  Her TORSO. His fork had dropped the `P.buildTorso` hook her `mrs-authoring`
  torso is built through, and his myofascial channels, pectoral patches and
  scapular construction are all measured in HIS chart. The hook is restored and
  every one of those blocks is excluded when a proportion set owns its torso.

  Her ARMS. She is built through the SHARED male limb path — `maleAnatomy` is
  true for her, deliberately — and her ~60 arm refiners locate control vertices
  by axial position and ring angle and THROW rather than sculpt the wrong ones.
  His R123+ arm work broke her on the first build. Every one of those advances
  is a NEW KEY appended to MRMAH_MORPHOLOGY.arms.planeDesign, never an edit of
  an R166 value, so `armDesign(legacy)` in arm-anatomy.js returns the design
  with those keys removed and her proportion set asks for it via `legacyArms`.
  MEASURED: her upper arms are now bit-identical to her retained build, and
  every other solid — torso, deltoids, forearms, hands, taper — already was.

  A third fault was mine and is fixed: `authoringMaster` (Mr. Mah's R136+ layer)
  is gated inside limbs.js on `maleAnatomy && authoringMaster`, so with the flag
  threaded from the scene entry his arm master landed on her arms and her
  shoulder returns refused it — "Posterior return exceeded local depth envelope
  ANTERIOR_LATERAL_DELTOID: 0.01226", ten minutes into a browser build. The gate
  is `P.name === 'male'` now.

VERIFIED AGAINST EVIDENCE: her clay front matches
reference/handoff/MRS_CURRENT_STATE_01_FULL_FRONT in every identifying respect
— diamond head with lashed eyes and the fuller lip, cranial growths, neck and
chest diamonds, broad muscular shoulders, segmented arms with biceps, triceps,
forearm and elbow joints, abdominal blocks, the narrow waist, the wide hip and
thigh sweep, and one fused teardrop to a single point. Proof set:
validation/mrmah3d/R232-reconstruction/mrs-mah__clay-iso__*.png, nine views,
isolated and at the low tier so no bloom halo thickens her outline.

THE COMPARISON THIS STATE FILE ASKED FOR, DONE. The previous NEXT ACTION was:
"Compare the front knee-to-calf width profile with the sculpt guide and identify
the missing macro silhouette relationship before further editing. Test a
different anatomical construction only if that comparison supports it."

Measured off the built mesh (widest |x| within +-0.026, her height 2.85), her
front profile rises monotonically from the point to a hip apex of 0.414 at
y 1.26-1.30 (t 0.44-0.46) and falls to a 0.219 waist at y 1.66. Its slope,
ascending, runs 0.25, 0.27, 0.29, 0.33, 0.41, 0.44, 0.45, 0.43, then dips to
0.31 at y 0.62 (t 0.218), recovers to 0.41-0.53, dips again to 0.42 at y 0.86
(t 0.302), and rises to 0.54 into the hip. So there are already two slope
inflections in the taper; they are shallow — a 1.4x break against the 2.0x his
knee now carries.

AND THE COMPARISON DOES NOT SUPPORT A TRANSVERSE KNEE EDIT. Her authority for
this region is reference/handoff/MRS_MAH_Lower_Body_Alignment_Upgrade.png, and
its "MUSCLE FLOW -> TEARDROP ALIGNMENT" panel is explicit: rectus femoris,
vastus lateralis, vastus medialis and the adductor flow all run LONGITUDINALLY
into one continuous taper to the point. There is no knee band and no calf swell
in its outline at all. Her lower-front clay already shows those columns, the
adductor channel, the medial teardrops and the central seam.

That is very likely why M48-M53 were all rejected: every one of them — the
oblique line recesses, the added-volume studies, the lateral contour
contraction, the taper-owner plane study, the shared-coordinate compression —
was a TRANSVERSE local deformation, and the reference does not pose a
transverse problem here. No further knee-band variant should be attempted.

NO GEOMETRY CHANGE MADE THIS PASS, and that is the comparison's verdict rather
than an unfinished one.

NEXT ACTION: her second stated defect — "stronger physical anatomy-following
crystalline planes" — is the one the reference actually supports, and it is a
CRYSTAL problem, not a silhouette one. Panels 3 and 4 of the alignment sheet
show broad facet planes laid over the muscle columns her geometry already has.
Judge it with the review page's `crystal` surface mode (the same matte read
taken over aCrystalNormal), against panel 3, before touching any table.

ANTI-REGRESSION: unchanged, plus — never let `authoringMaster` reach her, and
never let her arms be rebuilt under the current male arm design while
`legacyArms` is what her refiners expect. Both are measurable: her upper arms
must stay bit-identical to the retained build.
