MATCHED PROOF SET — R237 knee-band gate

Captured by a one-off driver in the session scratchpad (nothing in tools/ was
edited) against /mrmah3d/review/ at tier=low, surface=clay, isolated, from a
browser context created with reducedMotion:"reduce". That last detail is the
point of this set: the proof tool waits a fixed 420 ms and the body breathes,
so earlier "matched" captures differed across the WHOLE frame by a few luma
from idle phase alone. With motion off, the frame diff between two of these
builds is bounded to the knee band and nothing else.

  a3   RETAINED. The accepted checkpoint (commit 82d42f1).
  a3b  TRIAL 1, REVERTED. Kite deleted from `paths`.
  a3c  TRIAL 2, REVERTED. Kite kept as single-point paths (no constraint edges).

COMPARE-knee-band__*.png tiles the three at 5x over the same crop, in that
order: retained, trial 1, trial 2.

Same camera, framing, pose, lighting, material and renderer settings for all
three. Only mrmah3d/core/character/myofascial.js differs between them.
