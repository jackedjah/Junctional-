# MAH 3D — the retained handoffs, in the repository

The final-refinement pack arrived as two separate handoffs of the same package,
at two different builds, from two different working copies. Their controlling
documents live here so that the loop they describe can actually be run from
this repository rather than from a zip:

| file | what it is |
| --- | --- |
| `MR_MAH_MASTER.md` | his persistent agent loop — authority order, visual law, regional loop, definition of done |
| `MR_MAH_PROJECT_STATE.md` | his accepted base, active region, locks, defect, evidence, next action |
| `MR_MAH_CHECKPOINT.json` | R223-knee-recovery-3dd94ff46ba8 and its source hashes |
| `MRS_MAH_MASTER.md` | her persistent agent loop — identity, best-render lock, muscle-belly law, upper-curve law, lower-body law |
| `MRS_MAH_PROJECT_STATE.md` | her accepted base, active region, locks, defect, evidence, next action |
| `MRS_MAH_CHECKPOINT.json` | R166-M47-6217c80f7b5f, 101 source hashes and its topology audit |

Their evidence and the shared anatomy references are in `reference/handoff/`.

## What the reconstruction changed about them

Both handoffs describe a single-character working copy. In this repository
there is ONE renderer and a variant is a proportion set, so a few statements in
them are true of their own copy and not of this one:

- **Their source hashes will not match.** They were taken over CRLF files in
  separate trees. The sources here are LF, merged, and carry the reconstruction
  changes recorded in the R232 commit — including the `armDesign` pin that keeps
  her arms bit-identical to her retained build under his later arm work.
- **Their entry points differ.** Both are `createMrMah` now, in
  `mrmah3d/core/character/mrmah.js`: `{ authoringMaster: true }` for him,
  `{ variant: 'mrs-mah' }` for her. The scene entry threads both.
- **"Do not edit Mr. Mah" (her §Scope) still holds as a REVIEW rule** — a change
  made for her must not move him — but it can no longer be enforced by editing a
  different folder. It is enforced by the variant gates instead, and by the
  measurement: `tools/mrmah3d-profile.mjs` and `tools/mrmah3d-proof.mjs` will
  show either character moving.

Their anti-regression notes, rejected-trial labels and locked regions are
otherwise carried forward exactly, and are the reason several plausible
corrections are excluded. Read them before touching either character.
