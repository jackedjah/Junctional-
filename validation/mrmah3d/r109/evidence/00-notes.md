# Forensic evidence — state of the implementation at commit 7759f6f (branch claude/mrmah-3d-renderer-poc-1nyunz)

## What the renders in this folder ARE

Every `m-*.png` / `f-*.png` here was captured from the lab page at the CANONICAL framing
(`?canonical=1`, showcase mode, dead front unless a yaw is in the name; side = yaw 1.5708,
three-quarter = 0.52, rear = 3.1416). Same camera, same distance, same character height for
both characters and for every view. So a proportion mismatch against the reference is NOT a
camera mismatch between the two characters or between views; the reference hero renders use a
slightly lower camera and a longer lens than the lab (the lab looks slightly down at him), which
shows up mainly as the head reading a few percent wider than tall and the shoulders a little
higher in frame — nothing that changes a width ratio.

- `*-01..03-silhouette-*` = `?debug=mass`: every solid flat near-black, no lines. PURE SILHOUETTE.
- `*-04..07-clay-*` = `?debug=clay`: smooth matte Lambert clay with per-position smooth normals
  under the scene's lights plus a camera-side key. NO facets, NO coat, NO cyan, NO lines. The sculpt.
- `*-08..10-gray-*` = final material rendered, then desaturated (CSS grayscale). Facets + value, no colour.
- `*-11..14-final-*` = the delivered render at tier high (bloom, halo, theme = canonical blue).
- `m-d*.png`, `f-d*.png` = 2x detail crops of the FINAL material.
- `*-grid.png` = the same image with a labelled 5% grid (green = x of frame width, magenta = y of
  frame height) so widths can be read by eye and compared with `../audit/ref-male-grid.png` and
  `../audit/ref-female-grid.png` (the hero references with the same grid).

## Which sculpts are in these renders (be precise about this in findings)

- MR. MAH: the R109 lower body IS merged (quad-driven, restrained glutes, no calf bellies, one
  taper) and the R109 value pass IS applied (darker body, cyan cut). His UPPER body (deltoids,
  chest, arms, back) is still the R108 d state — an R109 upper-body sculpt is in flight in a
  worktree and is NOT in these renders.
- MRS. MAH: her geometry is the R108 d state (hip bloom → fold pinch → second bulge → knee →
  calf bloom; bust as two ring lobes) with the R109 value pass applied. An R109 female sculpt
  (bust architecture, waist, glute shelf, one continuous sweep, no calf) is in flight in a
  worktree and is NOT in these renders. Judge what is shown; label her defects as OBSERVED in
  the R108 d geometry and say which are already targeted by the in-flight sculpt only if you
  can see the defect in the render.

## Reference landmarks read off the 5% grid (fractions of CHARACTER HEIGHT, apex of the head = t 0, point = t 1; full widths)

| landmark | Mr. Mah hero (Ref A) | Mrs. Mah hero (Ref B) |
| --- | --- | --- |
| head height | 0.21 | 0.21 |
| shoulder span | 0.36 at t 0.28 | 0.34 at t 0.26 |
| waist (narrowest) | 0.157 at t 0.46 | 0.133 at t 0.40 |
| widest lower body | 0.27 at t 0.58 (quad) | 0.36 at t 0.53 (glute / upper thigh) |
| t 0.67 | ~0.20 | 0.22 |
| knee inflection | 0.157 at t 0.69 | soft, ~0.17 at t 0.74 |
| t 0.79 / 0.81 | 0.118 | 0.11 |
| t 0.88 / 0.91 | 0.063 | 0.05 |
| waist / shoulder | 0.44 | 0.39 |
| widest lower / shoulder | 0.76 | 1.06 |
| widest lower / waist | 1.75 | 2.7 |

Character height in the implementation is 3.0 units (point y 0, head apex y 3.0); t = 1 − y/3.

## Current implementation profiles (character-only masks; appended by the capture script — see capture.log)

See `capture.log` for the `m-mask-front` / `m-mask-rear` / `fna-front` / `fna-rear` lines: waist,
hip (widest lower body), B/W, shoulder run, and the width profile per t.

Before the R109 lower-body merge the male measured shoulder 0.382, waist 0.112, widest lower
0.192 (0.29 and 0.50 of the shoulders) with a knee pinch to 0.124 and a calf bulb 0.174; the
male-lower sculptor reports after: waist 0.138 at t 0.50, apex 0.268 at t 0.58, 0.166 at t 0.69,
0.114 at t 0.79, 0.064 at t 0.885, monotonic below the apex. The female (R108 d, limbs hidden)
measured shoulder 0.317, waist 0.086, widest 0.257 (B/W 2.99 front / 3.07 rear).

## Value measurements (energy-cyan classifier: chroma >= 60, hue 170–205, luma >= 100; "black" = luma < 48; "platinum" = luma >= 150 with chroma < 40)

| region (body-only box) | reference | implementation NOW |
| --- | --- | --- |
| male left pec | mean 43, 69% black, 2.7% cyan, 4.3% above 160 | mean 53, 47% black, 0.3% cyan, 0% above 160 |
| male quad | mean 61, 53% black, 2.9% cyan, ~4% above 160 | mean 47, 44% black, 0.4% cyan, 0% above 160 |
| male lowered upper arm | mean 27, 94% black (in shadow) | mean 53, 56% black, 1.5% cyan |
| male spear (lower taper) | mean 62, 59% black, 4.2% cyan, 5.6% above 224 | mean 39, 81% black, 4.5% cyan, 0% above 160 |
| chest box that INCLUDES the emblem | — | ~9% cyan whatever the material does (the diamond) |

Before the R109 value pass the pec was mean 96 / 20% black / 14% cyan and the arm mean 87 / 31% / 20%.
The female has not been value-measured yet (her geometry is about to change).

## Renderer facts that matter for root-cause classification

- Geometry is a procedural ring loft per character: a table of rings `{ y, w, d, shape(angle) }`
  spline-refined (`refine`), one continuous solid from the neck to the point (torso + lower body
  are ONE loft), plus `segment()` tubes for deltoids, upper arms, forearms, hands. There are no
  primitives glued together. The silhouette is `w` × the shape multiplier at the side angle.
- Facets are shading groups (`fg: [columns, bands]` per ring, bricked) over the smooth loft; the
  geometry does not move with the facets. Horizontal facet bands come from groups one authored
  band tall; longer groups (`[1,4]`) are now on the lats, abs and thighs.
- Value comes from per-region CLASS TABLES (regions.js: darkness per facet class, drawn per zone),
  a per-polygon platinum COAT weight, a near-black environment with small light cards, one key,
  two theme rims, a floor bounce, two lamps, an internal spear light and a core light.
- The head is a chamfered plate with a recessed face module (casing chamfer → cavity wall →
  channel floor → bezel → glass, with the eyes / smile as emissive content on the glass). It is
  LOCKED by the R101 head law (true square diamond, canonical size) — findings about the head
  should be about its optical layering, not its size or shape.
