# MAHWORLD map takeover handoff

Status: **MAP EDITING PAUSED** at the 2026-09-25 HALO repair/play release checkpoint. This document is for a separate Claude Code map session. It does not authorize Character, MAHFITT, S08, deployment, or new graphics work.

## Current playable build

| Item | Exact value |
|---|---|
| Visible build | `ASTRA_M7_HALO_REPAIR_PLAY_PRIVATE_20260924` |
| Protected preview | `https://6ab5db39db052ab31c510699--mahworld-test-preview.netlify.app/claude_gameplay_runtime/26_local_authority/lab/play?field=1` |
| Netlify deploy | `6ab5db39db052ab31c510699` (`ready`, `deploy-preview`, unpublished) |
| Packaged source | `3710e4588a7f853c84a1a376eee7d08fdabc0454` |
| Release-record parent | `cb06dc03b93a89c601b6be9d765a9b55652a1094` |
| Takeover asset checkpoint | `2d41d494853017add0865de4dfc645d06e66e7f8` |
| Package | 183 entries, 122,993,039 bytes, SHA-256 `a63114487c19a053dfb74c18cd4fc6f453424f7f805d73b895f1a887a90ed1aa` |
| Preserved production | `6aac25101f17ce5ed37166e4` |
| Preserved prior HALO preview | `6ab5c2451611040beb1093d8` |

The release gate passed 58 programs / 1,542 checks / 0 failures, 106-file JavaScript syntax, CSS/protected-boundary/183-file secret scans, exact fresh extraction and extracted smoke `7/7`. The password edge gate is active. Authenticated hosted gameplay was not automated because `MAHDEMO_PW` was unavailable; physical-phone acceptance remains the owner's.

## Source state and recovery method

- Repository: `https://github.com/jackedjah/Junctional-` (public).
- Authoritative map recovery branch: `backup/mahworld-m6-20260924T190351Z`.
- Gameplay root: `CLAUDE_GAMEPLAY_RUNTIME/`.
- The packaged build is stamped from `3710e4588a7f853c84a1a376eee7d08fdabc0454`; release records are in its descendant `cb06dc03b93a89c601b6be9d765a9b55652a1094`. The handoff checkpoint pushed by the completing session is the newest remote branch tip.
- The shared local checkout is intentionally dirty on `master` at `3185a25f80a23131fbdb2062fca9a1a1ffb7684f` and includes unrelated lanes. Do not reset, clean, blanket-stage, or treat that `master` index as the map authority.
- A checkpoint comparison against `cb06dc0` found no newer runtime/map source. It did find two registry-referenced runtime assets absent from the recovery branch: `_decimated/gym_rt.glb` and the feature-flagged `_decimated/training_display_rt.glb`. This handoff adds exactly those two assets with a supplemental manifest.
- Only two regenerated M6 floor-recheck evidence files otherwise differ locally; they are not source changes and are intentionally not substituted for the reviewed release evidence.
- All current executable map work through HALO repair/play is on the recovery branch after this handoff. Asset checkpoint `2d41d494853017add0865de4dfc645d06e66e7f8` adds the takeover records and two required runtime GLBs; a fresh sparse clone reproduced both byte lengths and SHA-256 values exactly. It does not import unrelated or superseded decimation candidates.

## Completed map state to preserve

- M1-M6Q world, terrain, road/junction, ecology, Moon/cloud, building, Dogkie, equipment, combat and resource-node work.
- M7 enlarged HALO contract: 240 m arrival, 295.2 m dome diameter, elevator-only normal access and contained interior flight.
- HALO repair: explicit boarding, occupied 20-second carrier travel, zero host/rendered passenger drift, retained held equipment and safe return.
- Upper floor repair: one opaque full-area deck owner, no transparent full-area overlay, stable NIGHT/DAY moving views.
- Playable HALO activities: real-input first-to-seven one-bot volleyball, scoring/result/replay/safe exit, plus five-serve target practice.
- Bounded mainland tranche: recognizable finned fish silhouettes; return-trip barbell authority and newcomer resource-bush fracture/drop/refill gate.

## Remaining map tasks

1. Owner physical-phone acceptance of the protected HALO repair/play candidate.
2. If phone feedback identifies a defect, reproduce and repair only that named defect before considering any expansion.
3. Authenticated hosted verification may be rerun only when the permitted demo password is available; never copy a password into source, logs or this public repository.
4. The larger five-sanctuary/master JOB A/B queue remains recorded, including unfinished mainland/world-development items. The HALO tranche did not claim bespoke dome climbing, missing-original recovery, or completion of every master-ledger row.
5. Character cleanup, MAHFITT and S08 remain separate jobs and must not be changed from this map takeover.

## Exact next action for the new Claude Code session

Fetch `origin/backup/mahworld-m6-20260924T190351Z` into a dedicated map worktree, confirm its tip, and read this file followed by `CONTINUE_HERE.md` and `ASTRA_TAKEOVER_STATE.md`. Do not use the dirty shared `master` index as the base and do not redeploy the existing candidate. The first implementation action is owner-feedback triage if phone feedback exists; otherwise pause and request the next explicitly authorized map tranche.

## Recovery asset locations

- Verified manifest: [`ASSET_BACKUP_MANIFEST.json`](./ASSET_BACKUP_MANIFEST.json). Its 98 rows / 1,454,701,148 bytes were previously read back from the remote recovery commit with zero missing files, mismatches or LFS-pointer substitutions.
- Takeover supplement: [`CLAUDE_MAP_ASSET_SUPPLEMENT.json`](./CLAUDE_MAP_ASSET_SUPPLEMENT.json), covering the two registry-referenced `_decimated` building assets added by this handoff.
- Immutable originals on the recovery branch: `25_HANDOFF/RECOVERY_ASSETS/originals/` (17 original source files).
- Current world derivatives and manifests: `26_LOCAL_AUTHORITY/lab/assets/world/`.
- Imported-building fidelity derivatives: `26_LOCAL_AUTHORITY/lab/assets/buildings/fidelity_m5c/`.
- Remaining current registry building assets: `26_LOCAL_AUTHORITY/lab/assets/buildings/_decimated/gym_rt.glb` and `training_display_rt.glb`.
- World registry: `26_LOCAL_AUTHORITY/lab/assets/world/world_registry_v1.json`.
- HALO authority: `26_LOCAL_AUTHORITY/play/haloLayout.js` and `26_LOCAL_AUTHORITY/play/HaloSport.js`.
- Release manifest: `26_LOCAL_AUTHORITY/deploy/packages/ASTRA_M7_HALO_REPAIR_PLAY_PRIVATE_20260924.PACKAGE.json`.

## Existing master and reference instructions

- [`CONTINUE_HERE.md`](./CONTINUE_HERE.md)
- [`ASTRA_TAKEOVER_STATE.md`](./ASTRA_TAKEOVER_STATE.md)
- [`RECOVERY_START_HERE.md`](./RECOVERY_START_HERE.md)
- [`ADDENDUM_QUEUE.md`](./ADDENDUM_QUEUE.md)
- [`01_MASTER_CONTINUATION.txt`](./RECOVERY_INSTRUCTIONS/01_MASTER_CONTINUATION.txt)
- [`02_PASTE_IN_ASTRA.txt`](./RECOVERY_INSTRUCTIONS/02_PASTE_IN_ASTRA.txt)
- [`04_GITHUB_REUSE_ADDON.md`](./RECOVERY_INSTRUCTIONS/04_GITHUB_REUSE_ADDON.md)
- [`MAHWORLD_M6_BACKUP_FIRST_AND_CONTINUE.txt`](./RECOVERY_INSTRUCTIONS/MAHWORLD_M6_BACKUP_FIRST_AND_CONTINUE.txt)
- [`M7 HALO scale/access addendum`](../../M7/MAHWORLD_M7_HALO_SCALE_AND_ELEVATOR_ONLY.md)
- [`M7 scale contract`](../../M7/HALO_SCALE_CONTRACT.json)
- [`M7 reference-lock continuation pointer`](./m7_reference_lock/CONTINUATION_POINTER.md)
- [`HALO repair/play continuation pointer`](./halo_repair_and_play/CONTINUATION_POINTER.md)
- [`HALO repair/play execution ledger`](./halo_repair_and_play/EXECUTION_LEDGER.md)
- [`HALO repair/play release record`](./halo_repair_and_play/private_candidate_release.json)

The consolidated master also remains local at `C:\Users\jahsu\Downloads\MAHWORLD_UNIFIED_CONVERGENCE_MASTER.md`; it is not duplicated into the public repository.

## Recovery-relevant material intentionally local-only

- Private HALO packet: `25_HANDOFF/CONVERGENCE/halo_repair_and_play/packet/` (6 files / 64,414 bytes) and source ZIP `C:\Users\jahsu\Downloads\MAHWORLD_HALO_REPAIR_AND_PLAY.zip`.
- Private M7 reference-lock packet: `25_HANDOFF/CONVERGENCE/m7_reference_lock/packet/` (16 files / 4,385,602 bytes) and source ZIP `C:\Users\jahsu\Downloads\MAHWORLD_M7_REFERENCE_LOCK.zip`.
- Consolidated master and video/reference bundle: `C:\Users\jahsu\Downloads\MAHWORLD_UNIFIED_CONVERGENCE_MASTER.md` and `C:\Users\jahsu\Downloads\MAHWORLD_VIDEO_SOURCE_BUNDLE\MAHWORLD_VIDEO_SOURCE_BUNDLE\` (78 files / 396,609,779 bytes).
- Generated release ZIP: `26_LOCAL_AUTHORITY/deploy/packages/ASTRA_M7_HALO_REPAIR_PLAY_PRIVATE_20260924.zip`; the reproducible package manifest and hash are committed.
- Local browser/probe media, regenerated M6 floor-recheck evidence and any credentials/environment values remain uncommitted.

After the handoff asset checkpoint is remotely verified, no recovery-critical executable map source or required runtime asset remains local-only. Private owner references remain local-only because redistribution to the public repository was not authorized.
