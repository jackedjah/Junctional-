# lab/world — module contract (JOB B, 2026-09-19)

Every feature module is an ES module exporting ONE factory `createX(ctx)` that returns
`{ build(): void|Promise, tick?(dt, t), setNight?(night: boolean), dispose?(), debug?() }`.
`build()` may be async (await `ctx.loadGlb`). Modules add their objects to `ctx.group` (already in the scene, never merged by
fieldScene's static merge). No module touches the player, camera, HUD, combat, click-to-move or the rig (JOB A). No module writes
host state. Presentation only; host colliders for what a module draws are generated from the SAME registry by
`deploy/jobb/build_world_colliders.mjs` through `lab/world/worldLayout.js` (pure functions — reuse them, never re-implement placement).

## ctx
- `ctx.THREE` — the vendored three.js 0.185 module namespace (NO addons except what is imported by name below).
- `ctx.scene`, `ctx.group` (THREE.Group 'MAHWORLD_JOB_B', userData.noMerge) — add objects under `ctx.group` (or `ctx.scene` for sky objects that must not be culled with the group; mark them `userData.noMerge = true`).
- `ctx.M` — shared MeshStandardMaterial families: `platinum, chrome, graphite, black, cyan, cyanLine, gold, crystal, sapphire, amethyst`. Reuse (one material = one draw call per chunk); clone only when you must animate a property.
- `ctx.registry` — lab/assets/world/world_registry_v1.json (read `zones`, `water`, `fixtures`, `artifacts`, `celestial`, `creatures`, `landmark_looks`, `material_families`, `ground`).
- `ctx.layout` — the host's collider layout (`landmarks[]` with envelopes, `interactables[]`, `shapes[]`) or null in isolation.
- `ctx.forestPlacement` — `[{ id, x, z, yaw, scale, tint, zone }]` from `forestLayout(registry, landmarks)` (the forest module MUST use exactly these).
- `ctx.fixturePlacement` — `[{ id, x, z, yaw, route }]` from `fixtureLayout(registry)` (the fixtures module MUST use exactly these).
- `ctx.loadGlb(runtimePath)` → Promise<gltf> (cached per path; `gltf.scene` is shared — clone it before modifying: `gltf.scene.clone(true)`; for skinned assets use `SkeletonUtils.clone` from `../../vendor/three/SkeletonUtils.js`). `runtimePath` is the registry string `lab/assets/world/<dir>/<file>.glb`.
- `ctx.url(runtimePath)` → the URL string.
- `ctx.night` (boolean, current), `ctx.quality` (the quality api: `get()` → tier object with `lod_far_m`, `particles`, `shadows` …), `ctx.renderer`.
- `ctx.playerPos()` → `{x,y,z}` (world metres, feet), `ctx.cameraPos()` → `{x,y,z}`, `ctx.playerHeading()` → radians (host facing, +φ turns right; forward = (sin φ, −cos φ)).
- `ctx.snapshot()` → the latest host snapshot `p` (`p.rules.match`, `p.creatures` if the host publishes them, `p.npcs`, `p.position`, `p.room`) or null.
- `ctx.addTick(fn)`, `ctx.onNight(fn)`, `ctx.rnd(seed)` → deterministic PRNG, `ctx.log(msg)`.

## World conventions
- FIELD metres, x east, z north, y up; the host character's forward is −Z in model space; yaw in the registry is DEGREES around +y.
- Day is the default; `setNight(true)` must switch the module's emissives / pools / sky without rebuilding geometry.
- Budgets: the phone MED tier. A module adds ≤ ~12 draw calls at rest (instancing, merged geometry) and no per-frame allocations in `tick`.
- Shared materials from `ctx.M`; per-instance colour through `InstancedMesh.setColorAt`.
- Nothing hides defects: no bloom, no fog tricks, no cover geometry.
