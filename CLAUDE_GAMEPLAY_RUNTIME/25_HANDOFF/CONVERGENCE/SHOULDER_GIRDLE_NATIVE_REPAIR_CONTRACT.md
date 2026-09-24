# SHOULDER GIRDLE — bounded native-source repair contract (owner hotfix 2026-09-19 §3 "native repairs via the authorized derivative workflow") · gameplay lane → Character / Blender lane · 2026-09-19

## 1. Question this contract answers
After the weight-only repair (ATHLETE_M_V11 = dev_0.16: seam-welded gradient smoothing, overlap weld, midline symmetry — `INTERJECTION_HOTFIX_0919_REPORT.md`), is the remaining shoulder defect something the runtime derivative can still fix, or a source-topology fault for the native lane? Measured answer: source topology (a covered hole in the quilt), native lane.

## 2. What was measured (pure node over the GLBs + the frozen runtime poses; no Blender)
- `deploy/mesh_components.mjs` on dev_0.16: the upper body primitive (role `upper`, 14 683 vertices, 11 241 triangles) is **1 485 connected patches**; 3 940 positions are shared by vertices of different patches (coincident, unwelded seams); the fused lower primitive is 223 patches.
- `deploy/mesh_seams.mjs`: on V9 / V10 / final V11 every coincident copy carries identical weights (0 differing groups) — the weld is honoured.
- `deploy/probe_mesh_stretch.mjs` (frozen runtime poses, CPU re-skin): overlap pairs (different patches within 4 mm at bind) that open > 12 mm at the pose: 0 at idle / push load / rotation release / hinge load / pull release / overhead load / chest fly load / double biceps (max separation ≤ 2 mm) — the weight-level junction is closed.
- `deploy/probe_intactness.mjs` (V11): at the DOUBLE-BICEPS emote (humerus ~92° abducted, scapular rhythm 0.53 rad) the rear-¾ view shows the background through the RIGHT rear shoulder / lat (`intact/emote_double_biceps_C_close_rear34.png`, neutral opaque material = not a material effect); the other 17 poses are judged per sheet in CONSOLIDATED_PHASE_REPORT_6.md.

## 3. Confirmed cause (topology), separated from hypotheses
CONFIRMED: with every overlap pair closed (≤ 2 mm) the hole cannot be two copies of one position pulling apart. The visible surface is missing = a patch of the quilt has an OPEN border there that is covered at bind by the rear-deltoid patch; when the deltoid patch follows the humerus + scapula the cover slides off the hole. A single-sided material shows the background through it. Weight changes move surfaces; they cannot add the missing surface.
HYPOTHESES (not verified): whether the hole is a Tripo muscle-volume intersection left open by the AM08 "base closed" step, or a hole produced by the auto-rig's split-leg / shell cut; either way it is in `Mah_Athlete_M_am08_v7.glb`'s geometry, not in the runtime.

## 4. Decision
Runtime shoulder work STOPS at V11 (weights only, measured, kept). No cover plate, no double-sided material, no bloom, no hiding, no reduced emote (the double-biceps pose is anatomically correct: 92° abduction + a 2:1 scapular rhythm). The residual is reported as NOT intact at the double-biceps rear-¾ and handed to the Character / Blender lane. BLENDER SLOT RESERVED stays: the gameplay session does not launch Blender.

## 5. Bounded native-source repair (for the Character lane, copied + versioned source, never the original)
Source: `ASTRA_VISUAL_CLEANUP/ATHLETE_M/02_CHECKPOINTS/AM08_BASE_CLOSED_RETAINED.blend` (sha256 6a6404c9…, the dev_0.16 manifest's `astra_candidate.retained_blend`) → a versioned copy (AM08 → AM08_SG1).
Scope (and nothing else):
1. Around each shoulder girdle (a ~25 cm sphere in metres around the glenohumeral joint: rear deltoid, teres / lat top, scapula, armpit, pec–deltoid boundary): merge the coincident boundary vertices of the muscle patches (Merge by Distance ≤ 0.5 mm, UV seams kept), then close every open border that a neighbouring patch covers at rest (bridge / fill so the region is one closed manifold surface). Do not resculpt, do not retopologise the whole body, do not touch the face, hands, hip, legs or the split line.
2. Export a derivative GLB with the SAME joints, inverse binds, materials and textures (the runtime's auto-rig runs unchanged over it: `make_class_rig_v5.mjs` → `rig_hip_connect.mjs` → `rig_shoulder_smooth.mjs`), version dev_0.17 / ATHLETE_M_V12, V11 kept for rollback.
Acceptance (runtime, not Blender): `mesh_components.mjs` shows the shoulder region as ONE component per side (or the whole upper body as one), `probe_mesh_stretch` overlap pairs open ≤ 2 mm at all matrix poses, and `probe_intactness` shows no background through the body at any of the 18 poses × 4 angles, normal speed and slowed — the owner's §4 matrix. Physical-phone artistic acceptance stays Jah's.

## 6. What the gameplay lane does meanwhile
Ships V11 as the default (rollback V10 / V9), keeps the intactness gate in the chain (`probe_mesh_stretch` + `probe_intactness` every candidate), and lists the double-biceps rear-¾ as the one open pose in every report until V12 lands.
