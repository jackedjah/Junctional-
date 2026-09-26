# Scenario / GameDev OS — discovery and the single paid-generation gate

Scope locked for this session: team `team_x1Cp7vdzaTzdJSQUXFYWwtHA` (Jackedjah's Organization, **free plan**), project
`proj_2iE4tooWHa67S5m1D69aqaWi` (Default Project). Discovery used only free, read-only calls (model recommendation, usage, memory recall).
**No generation has run and no credits were spent** (project usage: 0 CU in the last 31 days). The MCP tools do not expose the remaining
credit balance.

## What the free plan can and cannot run

| need in the pivot | purpose-built model | plan required | free-plan fallback |
|---|---|---|---|
| seamless PBR material sets (platinum panels, graphite plates, dark stone, road surfaces) with normal / roughness / metalness / height | PATINA Material | **Pro** | Scenario Texture (~28 CU, colour map only, seam-erase pass) or Gemini 3.1 (~28 CU, no tiling guarantee) |
| retexture existing finished meshes (imported temple / tower / market) keeping geometry | PATINA retexture (scenario-patina-retexture) | **Pro** | none equivalent |
| 360° sky concept exploration | Skybox Flux / Skybox GPT | **Starter** | Gemini 3.1 ultra-wide still (not seam-correct) |
| map / HUD icon set with transparent background | GPT Image 2.5 Sunburst / Flare | **Starter** | Gemini 3.1 (~28 CU) or Gemini 3.1 Lite (~7 CU) + background removal |
| horse quadruped auto-rig | scenario-3d rigging | not yet checked | — |

## Recommendation

1. **Do not spend free-plan credits on textures yet.** The free fallbacks give colour maps only; the world's current weakness is mostly
   lighting response, material metalness and geometry, which the passes are fixing procedurally at zero cost and with no texture budget.
2. **Owner decision:** whether to upgrade Scenario to **Pro** for one focused material sprint (PATINA Material + PATINA retexture). That
   is where Scenario would add the most perceived quality: premium platinum / graphite / stone surface families for architecture, roads and
   the HALO deck, and re-materialled imported landmarks — with full PBR maps sized for the tier texture caps (1024 on phones).
3. If the owner prefers to stay on the free plan, the one worthwhile paid gate is a **small icon set** for the PASS 5 map (sanctuaries,
   HALO elevator, resource node, activity, landmark — five-colour law), ~6 × 7 CU on Gemini 3.1 Lite, then background removal. It will be
   presented as one grouped request with the exact prompts and cost before anything runs.

Nothing here is authorised to run until the owner approves the specific grouped request.

## M8C re-check (2026-09-25): texture, retexture and 3D for the physical-world pass

Investigated again with free calls only (model search, schema, `dry_run` pricing — no job was created, nothing was charged; project usage
still 0 CU).

| skill / route | model | outputs | plan | cost (dry run) | fit for M8C |
|---|---|---|---|---|---|
| scenario-textures (PBR from a prompt) | `model_patina-material` (PATINA Material) | seamless basecolor + normal + roughness + metalness + height, 512–2048, tiling / upscale options | **Pro** (the free team gets 403) | — | best fit, blocked by plan |
| scenario-textures (maps from an image) | `model_patina` (PATINA Image to Maps) | the same five maps from an uploaded flat texture | **Pro** | — | would turn free colour maps into full PBR; blocked by plan |
| scenario-textures (seamless colour) | `model_scenario-texture` (Scenario Texture) | ONE seamless colour image; `eraseSeam` inpaints both seam axes | free | **33 CU** at 1024² quality high + eraseSeam · **12 CU** at quality medium | usable: we only need a luminance detail signal |
| scenario-patina-retexture | PATINA retexture | re-materialled existing mesh | **Pro** | — | not needed: M8C materials are world-space shaders, not per-mesh textures |
| scenario-3d | Meshy 7.1 / Hunyuan 3D / Pixal3D (image-to-3D) | textured meshes, 2K–8K PBR | varies | not priced | **not recommended** for this pass: the brief is materials + construction on existing host-safe geometry; generated meshes are heavy and would need retopology / LOD before a phone budget |

**How a Scenario Texture batch would integrate (no runtime texture exists today):** each colour map is converted OFFLINE (Node, no
Scenario call) to luminance only — so the five-colour law holds by construction — plus a height-derived normal, packed as one RGBA detail
texture per family (R detail value, GB normal xy, A roughness variation). `surfaceDetail.js` samples it TRIPLANAR in world space and only
modulates the existing procedural families at close range (inside each family's LOD fade), so nothing else in the pipeline changes and
LOW keeps the procedural path. Budget: 1024² on HIGH, 512² on MED, off on LOW; six families ≈ 24 MB uncompressed with mips at 1024 —
the main phone risk, which is why MED halves it.

**Grouped request prepared for the owner (NOT run):** six seamless textures, `model_scenario-texture`, 1024 × 1024, `eraseSeam: true`,
fixed seeds, one pass, no re-rolls:

| # | family | prompt |
|---|---|---|
| 1 | rock | stratified grey granite-gneiss cliff rock surface, horizontal bedding layers, fine vertical joint fractures, mineral grain, neutral cool grey, orthographic photographic surface scan, even diffuse lighting, no shadows, no colour cast |
| 2 | architectural platinum | anodised platinum architectural metal cladding, fine directional brushing, faint handling marks and satin oxidation, neutral silver-grey, orthographic surface scan, flat even lighting, no panel joints, no colour cast |
| 3 | stone / hardscape | honed graphite granite paving stone surface, fine speckled aggregate, subtle foot-traffic wear, neutral grey, top-down orthographic surface scan, flat even lighting, no joints, no colour cast |
| 4 | road | fine exposed-aggregate concrete road surface, small embedded stones, light weathering and hairline cracks, neutral grey, top-down orthographic surface scan, flat even lighting, no markings, no colour cast |
| 5 | natural ground | compacted natural ground, fine grey gravel, small stones and dry packed soil, no plants, neutral cool grey, top-down orthographic surface scan, flat even lighting, no colour cast |
| 6 | structural dark metal | dark graphite powder-coated structural steel, fine pebbled powder-coat micro texture, subtle edge scuffs, neutral near-black, orthographic surface scan, flat even lighting, no colour cast |

Cost: **6 × 33 = 198 CU** at quality high (or 6 × 12 = 72 CU at medium). Alternative owner decision: upgrade to **Pro** for PATINA
Material (true five-map PBR sets from the same prompts). Nothing runs until the owner approves one of these as a whole.

## Pilot outcome (2026-09-26)

The owner approved option E (rock + platinum, high, ≤ 66 CU). Rock ran (33 CU); platinum was refused by the free plan's 50 CU
custom-generation allowance before any job existed. Results, evidence and the recommendation: `SCENARIO_PILOT.md`. No further credits
without a new owner decision.
