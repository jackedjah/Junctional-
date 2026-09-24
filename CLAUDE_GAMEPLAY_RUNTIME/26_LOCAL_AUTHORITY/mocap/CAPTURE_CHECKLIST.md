# MAHWORLD capture checklist (Jah records) — generated from `lab/mocap/clip_manifest.json` v1.0

You are the performer (CSCS: your real reps are the reference). 22 clips still needed, 2 covered by placeholders (not recordings), 0 recorded of 24.

## Setup (every take)
- 2–3 clean takes each
- whole body in frame, fitted clothes, bright even light, phone steady at hip height 3–4 m away, 30 fps or more
- say the clip id out loud at the start of every take
- Phone video is enough; the AI mocap step (Rokoko Vision / DeepMotion / Move.ai — outside the repo, your account) turns it into a skeleton, Blender cleans contacts / root / pops and retargets onto the Mr. Mah skeleton (`20 mapped joints, feet → tips`), then export a GLB per clip named by the id below.
- Send the GLBs back; `node 26_LOCAL_AUTHORITY/mocap/validate_clip.mjs <clip.glb> --id <ID>` checks structure (bone map, no missing tracks, no T-pose frames, contacts, loop seams) — it does not judge the motion; that is the render and your eye.

## Locomotion
- **LOC_IDLE_CALM** · 60 s+ · loopable (keep going a few extra seconds so we can cut a clean loop)
  calm idle 60 s: breathing, small weight shifts, an occasional look around; no fidgeting
  ☐ needed
- **LOC_WALK** · 8 s+ · loopable (keep going a few extra seconds so we can cut a clean loop)
  straight walk, calm and confident, 8+ steps; the loop is cut on a left contact
  ☐ needed
- **LOC_JOG** · 6 s+ · loopable (keep going a few extra seconds so we can cut a clean loop)
  easy jog
  ☐ needed
- **LOC_RUN** · 6 s+ · loopable (keep going a few extra seconds so we can cut a clean loop)
  run at speed
  ☐ needed
- **LOC_START** · 2 s+
  from standing to walking, one clean start; then the same into a run
  ☐ needed
- **LOC_STOP** · 2 s+
  from walking to a settled stand (and from a run)
  ☐ needed
- **LOC_TURN_IN_PLACE** · 3 s+
  90° left, 90° right, then 180°
  ☐ needed
- **LOC_QUICK_TURN** · 2 s+
  180° turn while walking
  ☐ needed

## Gym patterns (regression · base · progression · strike)
- **PAT_HORIZONTAL_PUSH** · 3 s+ — regression / base / progression, then once more as a STRIKE (same mechanics, faster contact, held finish)
  three tiers, then the same as a STRIKE: same mechanics, faster contact, held finish (record as PAT_HORIZONTAL_PUSH_STRIKE)
  ☐ needed
- **PAT_VERTICAL_PULL** · 3 s+ — regression / base / progression, then once more as a STRIKE (same mechanics, faster contact, held finish)
  vertical pull / row, three tiers + strike
  ☐ needed
- **PAT_HINGE** · 3 s+ — regression / base / progression, then once more as a STRIKE (same mechanics, faster contact, held finish)
  hip hinge, three tiers + strike
  ☐ needed
- **PAT_ROTATION** · 3 s+ — regression / base / progression, then once more as a STRIKE (same mechanics, faster contact, held finish)
  rotation, three tiers + strike
  ☐ needed
- **PAT_SQUAT** · 3 s+ — regression / base / progression, then once more as a STRIKE (same mechanics, faster contact, held finish)
  squat, three tiers + strike
  ☐ needed
- **PAT_UPRIGHT_ROW** · 3 s+ — regression / base / progression, then once more as a STRIKE (same mechanics, faster contact, held finish)
  upright row, three tiers + strike
  ☐ needed

## Flight
- **FLY_TAKEOFF** · 2 s+
  takeoff jump (the fused form leaves the ground)
  ☐ needed
- **FLY_HOVER** · 6 s+ · loopable (keep going a few extra seconds so we can cut a clean loop)
  hover hold — performed standing tall, arms and trunk only (the runtime lifts the body)
  ☐ needed
- **FLY_CRUISE** · 6 s+ · loopable (keep going a few extra seconds so we can cut a clean loop)
  cruise lean
  ☐ needed
- **FLY_LAND** · 2 s+
  landing absorb from a small drop
  ☐ needed

## Guard · hits · knockdown · finish
- **GUARD** · 4 s+ · loopable (keep going a few extra seconds so we can cut a clean loop)
  guard stance, held, breathing
  ☐ needed
- **HIT_SMALL** · 1 s+
  small hit reaction; the placeholder is upper-body only and from another body
  ⏳ placeholder in the game (not a recording) — still needed
- **HIT_BIG** · 1.5 s+
  big hit reaction with a stagger step
  ☐ needed
- **KNOCKDOWN_GETUP** · 4 s+
  knockdown and get-up, on a mat
  ☐ needed
- **CAST_STAGING** · 2 s+
  the spell-cast staging; upper body only
  ⏳ placeholder in the game (not a recording) — still needed
- **FINISH_TAUNT** · 3 s+
  finish / taunt poses, two or three
  ☐ needed

## What is NOT on you
- Nothing here needs a new account, a purchase or credits from Claude Code; the in-repo work (manifest, validator, this list, the import helper) is done. Placeholders stay clearly labelled in the game’s Control Lab until your recordings replace them.
