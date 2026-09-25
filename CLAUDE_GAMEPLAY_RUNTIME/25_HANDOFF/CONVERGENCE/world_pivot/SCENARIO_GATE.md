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
