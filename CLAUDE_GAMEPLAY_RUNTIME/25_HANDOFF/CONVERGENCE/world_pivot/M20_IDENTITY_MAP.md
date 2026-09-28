# Identity-pass map (lead research 2026-09-28, read-only; file:line at 3857cdb — verify before editing)
R = lab/assets/world/world_registry_v1.json, CS = lab/cityScene.js, FS = lab/fieldScene.js, W/ = lab/world/. [D] generic cool default, [C] class accent.

## Territories
- regions R:2622: NEXUS circle (0,0) r 62 (family gold, GOLD_INLAY_RINGS, ground tint #e6c36a α .08); ATHLETE (−46..46,140..214)+(46..172,246..292),
  temple (0,178), gym LM_GYM (−112,110) outside every region; TITAN (60..172,74..146)+(46..172,150..210), tower (112,110), lake; LEAN (−170..−46,146..210)+
  (−172..−46,246..292), Spire House (−110,272), canyon x≈−112; VISIONARY (−172..−66,−50..52), overlook (−152,0); BAGE (−46..46,240..292)+gardens,
  market (0,258). Neutral: LUMINOUS_COAST (pink), MATCH_DISTRICT (76..168 × −48..70, CYAN_LINE_INLAY meso).
- tree_lock.zone_family R:5881: W purple · NW red · NE blue · N_W red · N_E gold · BAGE gardens pink.
- road families R:3065: 8 blue vs 4 gold, 4 red, 8 pink, 6 purple; resource patches blue-led.
- civic (rules_17_23.dev.json:1684–1760): Training Hall (−32..−17,−7..7), Arena Dome (0,−29) r 9.5, Mentor Spire (18..29,−6..6), Exchange
  (−9..11,20..29), HALO elevator (30,40).

## BLUE in shared spaces (biggest first)
- FS:210–214 plaza floor canvas: blue seams / arcs / guides / diamonds / "metallic-blue bands" rgba(70,120,190) — LARGEST [D]
- FS:217–221 district ground: blue route inlays plaza→landmarks + a blue ring round the Gold Temple (FS:221) [D]
- FS:274 four 0x9fd0ff beacon spheres (±14,3.2,±14) [D]
- CS:73 M.trim emissive 0xdfe8ff (1.7 at night) → bollards, arena ring, canopy downlights, HALO lights, serve lines; CS:75 diamond/emblem [D]
- R:3059 causeway_core #cfe8ff for every causeway core (W/terrain.js:92,101) [D]; CW_TOWER seam #5c8cff through NEXUS [C]
- RB_TOWER_BEND blue crystal bush (52,30) in NEXUS (R:7327) [C]; W/aura.js:112 HALO gyroscope ring blue [C]
- lamps: R:1471 CYAN_STREET_LIGHT head #bfe6ff emissive #6fc3ff; W/fixtures.js:119 LAMP_BLUE cyan-ish 205° [D posing as class]; PointLight 0xe3eaff
- night rig FS:150–152 (bg 0x070c16, key 0xd6deea, rim 0xb4c4dc, hemi 0x8a9ab4), atmosphere horizon #15213a, facade window night 0x252848 [D, natural]
- MAH MATCH: W/matchHall.js:242 crown tip 0x2f6bff, :388 blue aura 0x5a8cf0 nightK 5 [C in a shared building]
- duel courts W/combatZones.js:35 PALETTE ice 0xb3d1ff / core 0xe0edff [D]; W/props.js:13 HOLO 0x3fb8ff on the ATHLETE gym beacon [D — wrong class]

## GOLD / CRIMSON / PINK today
- shared: CS:78/292 laser-plant leaves 0xffc862; CS:283 NEXUS inlays gold/crimson/pink; CS:340 FAMS_RIM (HALO); serve-lab gold bullseye; bridges;
  sky beams BEAM_TEMPLE gold / BEAM_NORTH_PASS pink; coast pink; warm road lamps W/fixtures.js:58–62 (only gold casts coloured light).
- ATHLETE strong (landmark_looks R:921, architecture crown / skirt / seams / door W/architecture.js:76–126, lantern ring :39, sky gems aura.js:155).
- LEAN WEAKEST: only LEAN_SPIRE_HOUSE (R:6947), no landmark_looks, no hero crown.
- BAGE: landmark_looks R:942, market crown.
- night loss: rose / crimson lamps deliberately cast neutral light (W/fixtures.js:14–24; architecture.js:33 aura 0xeeeeee); moon-blue key leaves warm
  crystal dark (1.8× warm night glow W/terrain.js:34, architecture.js:190 the only compensation).

## PURPLE outside VISIONARY
- W/aura.js:39 spectral prism starts on violet → plaza emblem (CS:331), MATCH crown (matchHall.js:387), sun halo (aura.js:104)
- W/auraForms.js:174 floating-crystal default tint 0xb99cff; W/macro.js:191 falls glow 0x8c84c8; Veil: veilFalls.js:333, 494, 803, 834, 875
- purple roads into NEXUS: RP_FOREST_W starts (−40,40); RP_WEST_LINK; WF_5, WF_8

## Hooks
- tint tables: AMBIENT_TINT (ambientMagic), CLASS_TINT / CRYSTAL_TINT (aura.js:18,21), CLASS_HEX (duelRoster.js:28), CLASS_GLOW / CLASS_COLOR (facadeKit.js:16)
- lamps: LAMP_CLASS_LIGHT / lampCast / lampFamily / lampTint (fixtures.js:24–143)
- landmarks: WARM_LANTERN (architecture.js:33), crown :102, skirtAround :76, seamAt :77, doorFrame :126, premiumHouse :142, applyLandmarkLook (FS:46)
- hardscape: hardscapeLayout / INLAY / FAMILY_CLASS (hardscapeInlays.js:22–32), roadStyle (terrain.js:92), CLASS_PAVING (surfaceDetail.js:147)
- crystals: skyCrystals (aura.js:155), createFloatingCrystals (auraForms.js:150)
- facade show SHOW_PERIOD / showMaterial (facadeKit.js:23,249) equal 4.8 s gold·blue·red·purple·pink; signage crowns by road family (signage.js:23)
- duel courts IDENTITY_ORDER / PALETTE (combatZones.js:32,35), identity_markers (R:10455)

## Fitness / combat culture present
- MAH GYM LM_GYM (R:6814) + gym beacon; Training Hall + Arena Dome (CS:221); MAH MATCH hall + outdoor court; duel courts CZ_ELEVATOR_GROVE (45,110),
  CZ_GYM_LAWN (−47,121.5); NPC spar spots (−20,36),(36,−30),(128,50) R:8411; HALO SERVE LAB (CS:699).
