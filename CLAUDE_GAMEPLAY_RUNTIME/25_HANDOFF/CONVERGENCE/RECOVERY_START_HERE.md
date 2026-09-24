# MAHWORLD recovery start here

Updated 2026-09-24 for the emergency M6 backup and protected M6 preview release.

## Latest protected candidate

- Build `ASTRA_M6_PRIVATE_20260924`; immutable draft `6ab586ec9ad382fa1b83f1be`: `https://6ab586ec9ad382fa1b83f1be--mahworld-test-preview.netlify.app`.
- Package SHA-256 `82d5433350d9785e665fe9b5b74b88e07ddbf2c40a1c9e36c3a1a4fea87ab02c`; release record `astra_m6_release/private_candidate_release.json`.
- Production remains `6aac25101f17ce5ed37166e4`; M5C remains `6ab454bf3a60c4bf88b1334a`. Physical-phone acceptance and authenticated hosted gameplay remain open.

## Recovery identity

- Repository: `https://github.com/jackedjah/Junctional-` (verified PUBLIC on 2026-09-24).
- Recovery branch: `backup/mahworld-m6-20260924T190351Z`.
- Gameplay root on that branch: `CLAUDE_GAMEPLAY_RUNTIME/`.
- Snapshot basis: the current intentionally dirty M1–M6 gameplay worktree, not the old B8 checkout. The recovery commits are scoped snapshots parented to the verified remote gameplay ref; they do not rewrite or merge the default branch.
- Existing hosted comparison remains `ASTRA_M5C_PRIVATE_20260923`, deploy `6ab454bf3a60c4bf88b1334a`. The later authorized M6 release created only the protected draft recorded above.
- Verified source checkpoint: `bdc43b60d56c22253aeddf2eac996a5394128407`.
- Verified required-asset checkpoint: `a25277ebe6afc378af63ed19735a53f2c400327b`.

## Current M6 state

- Preserve every M1–M5C correction and the current M6 floor, ecology, sky, Moon, Dogkie, aura, equipment and attack-cadence work.
- M6 canopy/free mist and differentiated physical/physical-MAHGIC cadence are implemented and locally sampled.
- The dark circular/angular floor artifact at the authored `CW_GYM` / `RP_FOREST_W` junction is closed locally. Producer isolation proved a true-circle ribbon / 20-sided inscribed junction-disc boundary mismatch in `terrain.js`; the shared boundary is now 128 segments. Retain the old baseline and current proof folders when restoring.
- Character/MAHFITT/S08/Blender work is outside this recovery branch.

## Build and local preview

- Prerequisites actually used locally: Windows PowerShell, Git, Git LFS, Node.js, Python where the existing derivative scripts require it, and the vendored Three.js runtime under `26_LOCAL_AUTHORITY/vendor/three/`.
- Install/runtime metadata: `package.json`, `deno.lock`, and the derivative manifests under `26_LOCAL_AUTHORITY/lab/assets/`.
- Static preview build: `node 26_LOCAL_AUTHORITY/deploy/build_static_demo.mjs --out 26_LOCAL_AUTHORITY/deploy/static_dist`.
- M6 bounded visual probe: `node 26_LOCAL_AUTHORITY/deploy/jobb/probe_m6_closeout.mjs 26_LOCAL_AUTHORITY/deploy/static_dist`.
- Junction proof: `node 26_LOCAL_AUTHORITY/deploy/jobb/probe_m6_junction_proof.mjs 26_LOCAL_AUTHORITY/deploy/static_dist`.
- Cloud execution is **NOT TESTED**; no cloud GPU, Blender install, credentials or inherited environment are assumed.

## Instructions and ledgers

- Live handoffs: `25_HANDOFF/CONVERGENCE/CONTINUE_HERE.md` and `ASTRA_TAKEOVER_STATE.md`.
- Source/requirements records: `SOURCE_LINK_LEDGER.md`, `SOURCE_LINK_LEDGER.json`, `ADDENDUM_QUEUE.md`, and the existing JOB A/B handoffs.
- Owner backup directive is stored on the recovery branch at `25_HANDOFF/CONVERGENCE/RECOVERY_INSTRUCTIONS/MAHWORLD_M6_BACKUP_FIRST_AND_CONTINUE.txt`.
- The separately named `MAHWORLD_M6_FINAL_JUNCTION_FIX.txt` was not present in the project or Downloads top level at backup start; its full operative junction scope is restated in the owner backup directive and current handoffs.

## Assets

Read `ASSET_BACKUP_MANIFEST.json` before restoring. Its 98 rows were independently retrieved from a fresh sparse clone of asset checkpoint `a25277e` and matched by byte length and SHA-256: 1,454,701,148 verified bytes, zero missing and zero mismatch. Originals remain immutable. Never upload secrets, `.env` values, credentials, private footage, browser profiles or unrelated job files.

## Next executable task

Restore the exact recovery branch and required asset bytes, read the two current handoffs, and preserve the closed M6 junction proof. The next larger milestone is a separately authorized protected M6 preview. Do not package, deploy, publish, or begin a new world/character redesign without that authorization.
