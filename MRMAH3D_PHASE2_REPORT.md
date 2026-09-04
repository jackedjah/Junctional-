# MR.MAH 3D — PHASE 1 (HIGH-FIDELITY) IMPLEMENTATION REPORT

**Reference-parity pass. Experimental. Not in production.**

Branch `claude/mrmah-3d-renderer-poc-1nyunz`. Additive only — no MAHFITT
production file is modified or present. Target:
`reference/mrmah-canonical-front.png`.

---

## A. Result

| Measure | Value |
| --- | --- |
| Silhouette score | **89.4 / 100** (mean width error 3.70% of character height) |
| Silhouette IoU | 69.7% (see caveats below) |
| Proportion checks | **7 / 7 within tolerance** |
| Character luminance | mean 77.1 vs reference 68.2 |
| Static contracts | **146 / 146 PASS** |
| Runtime checks | **92 / 92 PASS** |
| Cost | 3,328–3,810 triangles · 85–102 draws · 1.0–1.6 ms/frame |

Proportion detail against the reference:

| | reference | render | delta |
| --- | --- | --- | --- |
| character height / frame | 0.6699 | 0.6637 | −0.9% |
| character top / frame | 0.1501 | 0.1563 | +4.1% |
| head width / char height | 0.3268 | 0.3258 | −0.3% |
| head aspect W:H | 1.280 | 1.263 | −1.3% |
| shoulder width / char height | 0.6179 | 0.5593 | −9.5% |
| head vs shoulder width | 0.529 | 0.582 | +10.0% |
| max width / char height | 0.6196 | 0.6234 | +0.6% |

**IoU caveat.** 69.7% understates the agreement. The reference mask is built by
flood-filling the void and keeping what is enclosed, which (a) includes the
glow bleed around the reference's own edges, so it reads slightly larger than
any geometry everywhere, and (b) fills the gaps between arm and torso, which
the render correctly leaves open. The width-profile score is the more honest
number.

---

## B. What was built

Everything in `mrmah3d/core/character/` is new:

| Module | Owns |
| --- | --- |
| `proportions.js` | every measurement, traced to the reference |
| `forge.js` | faceted-solid builders: loft, segment, diamond crystal |
| `materials.js` | crystal body, edge illumination, face, rim |
| `head.js` | diamond crystal head, recessed face plate, eyes, smile |
| `body.js` | torso, shoulder caps, neck, chest emblem, transport symbols |
| `limbs.js` | arms as joint hierarchies, hands, digits |
| `states.js` | behaviour states, page-agnostic |
| `mrmah.js` | assembly and per-frame drive |

Real 3D throughout, not a plate with lines on it:

- **Head** — a beveled diamond with front-to-back depth, four front bevels, a
  back apex, and a face plate that is inset *and pushed back behind the bevel
  ring*, so the face is genuinely recessed inside the crystal.
- **Torso** — an 8-sided loft over 13 measured rings, with alternating facet
  relief and alternating quad diagonals so every triangle carries its own
  normal, plus a `dip` on the top rings that cuts the reference's collar
  chevron.
- **Arms** — shoulder → upper → elbow → forearm → wrist → hand → digits, each
  a real joint. The arms can be posed because they are not welded to the torso.
- **Insignia** — chest diamond and the ◁ ◇ ▷ transport row, emissive.

Materials follow the reference's hierarchy: a dark crystalline body that is
*lit*, thin geometry-derived cyan edges, sparse near-white specular catches, a
near-black recessed face, and unlit tone-mapping-exempt eyes and smile so bloom
can never eat them.

**Camera** solved from the reference, not chosen: 32° FOV, distance 7.81,
pitched **up** 3.22° (the reference's horizon sits below frame centre), camera
Y 1.15, target Y 1.59. Those three constraints are the composition; they should
not be rounded off.

**World** — converging grid with glowing intersections, ground starburst under
the tip, flanking faceted pyramids in depth, drifting motes, linear fog.

---

## C. The comparison loop, and five faults it caught

The loop ran thirteen times. These were found by measuring and by looking, not
by reading code:

1. **The floor had no perspective.** The grid's near edge sat at z = +9 with
   the camera at z = +7.81, so every receding line straddled the near plane and
   was dropped by the rasteriser. Converging rows measured **0 → 350**.
2. **The raised arm's elbow was in the wrong place.** Read from the image it
   looks like y≈780; with a pixel grid overlaid it is a deep V bottoming at
   y≈865. The wrong reading left the silhouette 22% too narrow across
   t=0.47–0.55, exactly where the reference is widest. Score **80.1 → 87.8**.
3. **The character read as a wireframe.** The edge halo pass had
   `depthTest:false`, so every hidden back edge drew over the front of the body.
4. **The crystal rendered black.** A metallic material with no environment has
   nothing to reflect. Adding a small procedural PMREM environment — and making
   it *bright*, since it is a reflection source and never seen directly — is
   what made the facets read.
5. **`setGlow` silently overwrote the material.** It carried duplicated
   baseline literals, so editing `emissiveIntensity` at its definition had no
   effect: the first frame overwrote it. Baselines are now captured from the
   materials themselves.

Two measurement bugs were also fixed, in tools rather than in the render: the
head landmark finder used a fixed "upper N%" window that always caught the
shoulders (reporting a 603px head against a true 366px one), and the render
mask counted the background pyramids as body (reporting it 59% too wide).

---

## D. Interaction and behaviour

Tap and drag are reliably distinguished — a press only becomes a drag past 9
css px of travel, and once it is a drag it can never become a tap. Verified:

- a clean press → `tapped`
- a press with 4px of jitter → still `tapped`
- a real drag → `dragging`, never fires a tap, rotates 1.536 rad
- on release → returns to the **host's** state (`thinking`), not to `idle`

Eight states exist — idle, listening, thinking, explaining, success, concerned,
tapped, dragging — as declarative target sets eased frame-rate-independently.
`states.js` contains no reference to AI Chat, MAH Protocol or any page.

---

## E. Mobile

DPR capped per tier (1 / 1.5 / 2) under a pixel budget; loop stops on hidden
tab, `pagehide` and off-screen; `destroy()` releases the WebGL context;
geometry count flat across repeated resizes; `prefers-reduced-motion` honoured
(hover and joint motion stop, the character still renders).

Measured on a 393×852 mobile viewport at DPR 3:

| tier | DPR | draws | triangles | ms/frame |
| --- | --- | --- | --- | --- |
| low | 1 | 85 | 3,328 | 1.00 |
| medium | 1.5 | 102 | 3,810 | 1.59 |
| high | 2 | 102 | 3,810 | — |

---

## F. The five biggest remaining visual differences

1. **Contrast is still flatter than the reference.** Character pixels cluster
   at 41%/37% in two mid bands; the reference spreads 33/28/15/9/6/4/3/3 from
   black to white. He is a slightly more uniform blue than he should be.
2. **No true bloom.** The reference's soft glow around every lit edge is
   approximated with an additive halo pass and a rim shell. A tier-gated
   selective bloom would close most of the remaining atmosphere gap.
3. **The head's dark face plane is larger and flatter** than the reference's,
   which shows more crystal structure around and through the facial area.
4. **Arms are simpler than the reference's.** They are faceted prisms; the
   reference's arms carry visible plane breaks and internal triangulation
   comparable to the torso.
5. **Background structures barely read.** The flanking pyramids are present but
   sit too far into the fog to contribute the depth the reference gets from
   them.

---

## G. Not claimed

- **No physical iPhone/iPad validation.** All evidence is headless Chromium on
  a **software rasteriser** (ANGLE/SwiftShader). Good evidence for geometry,
  proportion, lighting, lifecycle and layout; **not** evidence about Retina
  panels, real GPU drivers, thermals or battery. The ~30fps observed here is a
  property of software rendering and should not be extrapolated either way.
- Not final art. Materials, bloom, hands and the environment all have known
  gaps listed above.
- No AI Chat or MAH Protocol integration, and no production exposure. The state
  API exists and is documented, but nothing is wired.
