# STATUS: INPUT_RECEIVED (2026-09-16, later the same day)
Donor delivered by the owner as `Downloads\MAHWORLD_TRIPO_DONOR_RECEIVED.zip`, extracted (originals untouched) to
`MAHWORLD_CHARACTERS\INCOMING_TRIPO\donor_received_2026-09-16\INPUTS\purple+armor+3d+model.glb`
SHA-256 `d799e00242e95458532b840cffe1e89fc6454f2c2ee5c2122603b9b44e5b19c9` (37,522,832 bytes) — verified locally.
Local inspection (`deploy/inspect_rigged_glb.mjs`, JSON in `deploy/donor_inspection_local.json`): one skinned mesh (325,191 verts, 614,668 tris,
4 influences, no morphs), skin "Armature" 41 joints with inverse binds, FIVE skeletal clips: preset:biped:cast_a_spell 5.417 s, hit_to_head 1.875 s,
agree 4.042 s, angry_02 2.208 s (root travel 1.12 m), afraid 2.625 s. Verdict ANIMATED_SKELETAL_DONOR.
The section below is the original note, kept as history.

---
# TRIPO UPPER-BODY DONOR — MISSING INPUT (checked once, 2026-09-16)

## What was checked (bounded, read-only)
- `C:\Users\jahsu\Downloads` (top level, every `*.zip` listing, loose `*.glb` / `*.fbx`)
- `Downloads\MAHWORLD_CHARACTERS` (RAW_10_MODELS, WORKING_10_MODELS, CHARACTER_EXCHANGE, project tree, 4 levels)
- `Downloads\MAHWORLD_CLAUDE_CHARACTER`, `Documents\Codex\...\files-pasted-by-the-user-mahworld` (Astra tree, names only)
- Desktop / Documents / Pictures / Videos / OneDrive (names `tripo*`, `IMG_0836*`, `inspect_rigged_glb.py`, `*visionary*`, `*.fbx`)

Every GLB was opened and its glTF JSON read (skins / animations / nodes / generator), not judged by filename.

| file | skins | animation clips | verdict |
|---|---|---|---|
| `MAHWORLD_CHARACTERS\RAW_10_MODELS\Mah_Visionary_F.glb` (= copy in `MAHWORLD_ALL_10_ORIGINAL_GLBs.zip`, 30.7 MB) | 0 | 0 | static Tripo export, 1 node — **not rigged** |
| `MAHWORLD_CHARACTERS\WORKING_10_MODELS\Mah_Visionary_F.glb` | 0 | 0 | same static asset |
| `Downloads\golden muscular 3d model_Clone1.glb` | 0 | 0 | Athlete_M static clone (already known) |
| `ImageToStl.com_F4551554-…(1).zip` → `F4551554-….glb` (55 MB, Blender I/O) | 0 | 0 | static, no morphs |
| `tripo-showcase-32b26a59-…(.mp4 ×3)`, `IMG_0836.jpeg`, `inspect_rigged_glb.py`, `01_DEMO_VERIFIED_AB_AND_FINISH.txt` | — | — | **not present** in any checked location |

No file on the machine contains a skeleton, skin weights or joint-animation clips for Visionary_F. The MP4 showcases (not present either) would not contain skeletal data in any case.

## The single owner action required
In Tripo Studio, open the **rigged Visionary_F asset** (the one whose showcase UUID is `32b26a59-3e28-407c-9338-35acd5924ae0`), use the asset's main **Export** control (not SHARE TEMPLATE / Video), and export **GLB** with **Skeleton + Animations included**, selecting the three actions used in the showcases (Tripo help: "export multiple animations into a single file for Blender"). FBX is acceptable if GLB is not offered.
Drop the file(s) at:

    C:\Users\jahsu\Downloads\MAHWORLD_CHARACTERS\INCOMING_TRIPO\Visionary_F_rigged.glb   (or *.fbx; one file per action is fine — keep the preset names in the filenames)

Nothing else is needed (no re-rig, no new generation, no purchase). If the export dialog shows a Studio charge for this one operation, tell me the displayed amount before proceeding — I will not start any API billing.

## What continues meanwhile (independent of the donor)
first-cast warm-up (done, measured), NPC real-input check, overhead ≥140° inspection, donor inspector + retarget mapping scaffold, A/B motion selection switch.
When the export lands: `node 26_LOCAL_AUTHORITY/deploy/inspect_rigged_glb.mjs <file>` reports the skeleton / binds / clips / root motion before any retarget work.
