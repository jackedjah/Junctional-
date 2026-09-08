# Three.js application checklist — scoped to this steer

These are five verified official references for this addendum, not a claim to reconstruct a historic five-link list. Reviewed 8 September 2026. Follow the installed version's compatible API. They do not prescribe artistic curvature thresholds.

## 1. BufferGeometry
https://threejs.org/docs/pages/BufferGeometry.html

The geometry contains positions, indices, normals, and other attributes. Indexed and non-indexed normal recomputation differ. After a source geometry change, inspect the resulting buffers; check topology and shading separately. Recompute affected bounds when needed. Do not blanket-recompute authored normals on unrelated crystal regions. Free obsolete geometries only when no longer shared or in use. Preserve UV/morph/skin correspondence if topology changes; do not declare compatibility without tests.

PROOF: affected mesh/owner, finite positions, valid triangles, attribute correspondence, bounds, and the actual rendered result. Source edits alone do not prove a visible correction.

## 2. Color management
https://threejs.org/manual/en/color-management.html

Three.js uses a linear working color space and requires appropriate input/output conversions. Keep material, light, exposure, tone mapping, and output settings fixed across anatomy comparisons. No 'improvement' created only by changing the grade or blue illumination.

PROOF: same renderer settings for baseline and candidate. Temporary neutral-review settings must not overwrite the canonical appearance.

## 3. OrbitControls
https://threejs.org/docs/pages/OrbitControls.html

Reuse the current orbit/zoom viewer for inspecting multiple directions. Save camera/target settings for matched comparisons. Do not rebuild the reviewer for this patch.

PROOF: accessible front and three-quarter views; guard side view where projection changes. No hidden defects behind a flattering angle.

## 4. PMREMGenerator
https://threejs.org/docs/pages/PMREMGenerator.html

PMREM prepares environment lighting for material roughness levels. Preserve the established environment pipeline during anatomy changes. Do not repeatedly regenerate reflections as part of geometry diagnosis.

PROOF: same environment for the baseline/candidate. This pass is not a reflection upgrade.

## 5. MeshPhysicalMaterial
https://threejs.org/docs/pages/MeshPhysicalMaterial.html

The advanced PBR material has extra per-pixel cost and benefits from environment lighting. Keep its current parameters fixed during this pass. Do not add transmission, clearcoat, or stronger glow to hide missing muscle form.

PROOF: canonical material is preserved; clay preview is diagnostic only. Later platinum review is a separate task.

## Brief visible record

At startup show these five links once. For the active step report only the relevant application:
`REFERENCE USED -> API/source owner -> actual check/evidence`.
For unused items state `preserved / not changed`. Printing a link is not proof it was applied. Do not reopen or recite all five every micro-pass.
