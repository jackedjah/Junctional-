# MAHWORLD WORLD 01 — CAMPUS / CITY RECONSTRUCTION MASTER
## Claude Opus PAL Master — Full Spatial Rebuild, Same World Identity

# 0. MISSION
Reconstruct WORLD 01 / MAHPLAZA spatially and architecturally while preserving the existing world identity, facility names, sea-border logic, MAH ASCENT/elevator concept, and compatible game systems.

The current plane is too compressed, cluttered, jagged, spike-heavy, and visually unreadable as a real social game space.

The new target is:
**PREMIUM FUTURISTIC COLLEGE CAMPUS + CITY + SOCIAL MMO WORLD.**

Think of a university campus with a large central quad: buildings are separate destinations, streets and paths make sense, people can see one another, NPCs gather at entrances, seating exists, and the sea/horizon remain visible.

This is NOT a rename/re-lore pass. It is a macro-layout + architecture-quality reconstruction.

# 1. CENTRAL QUAD
The middle of the plane should become a mostly open campus quadrangle.

The central quad is:
- social field
- meeting place
- circulation hub
- visual breathing zone
- player gathering area
- orientation landmark

Keep the center mostly empty.

Allowed in restrained amounts:
- seating
- low lighting
- subtle landscape
- wayfinding
- a small refined civic symbol
- paths crossing or framing the quad

Remove, relocate, or dramatically reduce the current giant Mr./Mrs. monument. It currently blocks sightlines and reads too low-fidelity.

If Mr. Mah / Mrs. Mah civic art remains:
- use canonical character geometry
- platinum/liquid-silver material
- small enough to preserve openness
- place it as refined civic art, not as a giant obstruction

# 2. BIG-TO-SMALL ORDER
Do not detail before topology is correct.

PHASE A — WORLD SKELETON
- quad
- primary roads
- pedestrian routes
- sea boundary
- district zones
- facility locations
- dome/horizon relationship
- elevation

PHASE B — BUILDING MASSING
- named facilities
- secondary buildings
- placeholder/ambient buildings
- service/support buildings
- elevator nodes

PHASE C — HUMAN-SCALE CIRCULATION
- sidewalks
- steps
- ramps
- stairs
- seating
- crossings
- entrances
- forecourts
- NPC gathering zones

PHASE D — ARCHITECTURE
- rounded shells
- glass
- crystal
- platinum/silver
- graphite
- windows
- signage
- facade depth

PHASE E — LIGHT/MATERIAL/POLISH
- deep blue night
- premium PBR
- controlled accents
- readable lighting

PHASE F — GAMEPLAY/PERFORMANCE
- NPCs
- collision
- LOD
- instancing
- culling
- mobile/tablet performance
- multiplayer scalability

# 3. CAMPUS SPACING LAW
Major buildings must feel like separate destinations.

Preserve names such as:
- MAH GYM
- MAH MATCH
- MAH MARKET
- MAH ASCENT
- existing compatible named infrastructure

Each major building needs:
- approach space
- entry forecourt
- surrounding paths
- side/rear circulation
- landscape/buffer space
- at least one long sightline

Do not pack facilities like storefronts touching each other.

# 4. ROAD / STREET SYSTEM
Build real roads and campus circulation.

Create:
- primary campus loop/boulevard
- secondary access roads
- pedestrian-priority paths
- drop-off/service areas
- future vehicle lanes where sensible
- crossings
- clear road vs pedestrian separation
- curved campus-style routes

Roads/paths should support future NPCs, vehicles, events, deliveries, and expansion.

# 5. ELEVATORS / MAH ASCENT
Make elevators:
- more frequent
- smaller
- less visually dominant
- easier to access
- integrated into paths/roads

Each local node should have:
- small premium landing
- stairs
- seating where appropriate
- clear entrance/exit
- subtle lighting
- social waiting space

The main MAH ASCENT may remain special. Local nodes should feel like infrastructure, not monuments.

# 6. SOCIAL INFRASTRUCTURE
Add logically clustered:
- benches
- low seating walls
- circular seating
- stair seating
- terraces
- sheltered areas
- waterfront seating
- elevator waiting zones

Do not turn seating into clutter.

# 7. NPC + PLACEHOLDER BUILDINGS
Add secondary buildings that may not yet have gameplay functions.

Possible roles:
- residences
- cafes
- small shops
- social halls
- studios
- civic rooms
- galleries
- future facilities

They must:
- match MAHWORLD
- have real entrances
- have windows/interior light
- support believable streets
- remain visually secondary to named facilities

NPCs should appear:
- near entrances
- on sidewalks
- at benches
- near stairs
- around quad edges
- at elevators
- by the waterfront
- in small social clusters

# 8. SHAPE LANGUAGE — NO RAW SHARP EDGES
Default architecture from this phase forward:
**ROUND / FILLETED / SOFT-SCULPTED / PREMIUM.**

Target feeling: approximately halfway between a hard rectangular block and a fully circular/capsule form.

Practical proportional guidance:
- small structural edges: radius ~8–12% of local thickness
- medium podium/facade corners: ~15–25%
- hero shells/public structures: ~20–35%

Use judgment by scale. Do not use one global radius.

No raw 90-degree hero corners.
No jagged primitive stacks.
No unfinished low-poly silhouette.

# 9. ARCHITECTURE LANGUAGE
Use:
- rounded cubes
- square-diamonds
- smooth reflective crystal
- glass
- platinum
- silver
- graphite
- black crystal
- curved frames
- soft shell architecture
- sculpted glass
- selective faceting

Hierarchy:
**smooth mass → premium material → selective diamond/crystal detail.**

Avoid:
- spike forests
- sharp fins everywhere
- random shards/triangles
- repeated black poles
- unsupported thin geometry
- jagged skyline noise
- over-faceted facades

# 10. REAL GAME READABILITY
At gameplay distance, players must understand:
- what building is ahead
- where entrance is
- where path/road goes
- where they can sit
- where other players are
- where quad begins/ends
- where sea is
- where next district lies

Use setbacks, signage, lighting, approach geometry, and landmark hierarchy.

# 11. SEA BORDER / FUTURE WORLDS
The sea is a major world boundary and future crossing layer.

Treat it as:
- edge of current world
- visual breathing zone
- future portal/crossing space
- border to future regions/worlds
- navigation cue

Create premium waterfront:
- promenades
- seating
- overlooks
- stairs/ramps
- potential crossing/docking points
- distant silhouettes where appropriate

Do not wall the sea off with buildings.

# 12. DOME / HORIZON SCALE
The dome should feel enormous, not like a low roof.

Use:
- atmospheric depth
- high vertical volume
- distant lighting
- rare massive silhouettes
- far districts
- water
- clouds/haze
- long elevated routes

The player should sometimes feel tiny, while the ground remains human-scale.

# 13. COLOR / LIGHT
Dominant:
- silver
- gray
- graphite
- near-black
- deep navy / blue-black
- cool white

Selective accents:
- sky blue
- cyan-blue
- purple
- clean red

Avoid:
- yellow
- orange
- amber
- bronze
- gold warmth
- reddish-orange grading

Night target:
deep blue + reflective + premium + readable.

# 14. MATERIAL QUALITY
Prefer physically based Three.js materials where suitable:
- MeshStandardMaterial
- MeshPhysicalMaterial
- PMREM/environment reflections
- controlled roughness/metalness
- selective clearcoat
- controlled transmission
- broad specular bands
- real shadow hierarchy

Avoid:
- flat gray
- white plastic
- mirror-everything
- excessive bloom
- emissive-only fake metal

# 15. THREE.JS IMPLEMENTATION LAW
Separate owners for:
- world layout
- building factories
- materials
- roads/paths
- landscape
- elevators
- NPCs
- lighting
- effects
- cameras/controls
- diagnostics
- LOD/culling
- loading/disposal

Do not grow one giant scene file.

Reuse:
- shared geometry
- shared materials
- InstancedMesh for repeated props
- modular stairs/benches/lights/windows
- shared building detail kits

Use LOD/distance simplification for:
- distant buildings
- repeated props
- NPCs
- landscape
- windows
- facade details

Use:
- frustum culling
- district/chunk visibility control where practical
- distance-based effect suppression
- selective shadow casters
- limited real light count
- emissive windows instead of hundreds of point lights

Minimize unique materials.
Use smooth curves with sensible sampling.
Use delta-time animation.
Avoid multiple uncontrolled RAF loops.
Dispose superseded GPU resources.
Maintain correct color-space/tone-mapping/exposure.
Use mobile-aware pixel ratio and resize-safe rendering.

Performance rule:
**Do not trade a playable world for a screenshot.**

# 16. BUILDING DETAIL STRATEGY
Every building passes:
1. massing
2. approach/entrance
3. circulation
4. shell rounding
5. major materials
6. windows/openings
7. signage
8. facade detail
9. street furniture
10. interior glimpse/depth
11. lighting
12. performance

# 17. NAMED FACILITY DIRECTION
MAH GYM:
- open
- aspirational
- flowing
- silver/glass
- generous approach
- training visibility if practical

MAH MATCH:
- combat/arena identity
- stronger shell
- rounded armored mass
- clear event forecourt
- no spike-heavy design

MAH MARKET:
- civic/social/commercial
- pedestrian activity
- terraces
- glass frontage
- secondary shop/cafe adjacency

MAH ASCENT:
- smaller repeated local nodes
- main iconic ascent can remain special
- stairs + seating + path integration

# 18. MR./MRS. CIVIC ART
The current huge statues should not remain as-is.

Acceptable:
- remove entirely
- relocate
- miniaturize
- convert to premium relief/plaque
- place at shrine/museum/ascent
- use true canonical character geometry for any sculpture

Never again use giant low-fidelity approximations.

# 19. CLUTTER REDUCTION
Remove/relocate:
- unnecessary black poles
- redundant fixtures
- giant foreground beams
- repeated spikes
- decorative junk
- excess micro-panels
- central obstructions
- duplicated lights
- meaningless facade shards

Do not refill cleared space with replacement clutter.

# 20. PLAYER / SOCIAL SCALE
Design for:
- 2 people talking
- 10-person gathering
- 50+ person event
- NPC clusters
- sitting/hanging out
- spectators
- casual roaming

Large space is not empty if it is designed for people.

# 21. FIXED DIAGNOSTIC CAMERAS
Maintain:
1. CENTRAL QUAD HERO
2. QUAD EDGE LOOKING ACROSS
3. ROAD/STREET
4. MAH GYM APPROACH
5. MAH MATCH APPROACH
6. MAH MARKET APPROACH
7. ELEVATOR NODE
8. WATERFRONT
9. DOME VASTNESS
10. HIGH OVERVIEW
11. NIGHT CITY
12. NPC SOCIAL CLUSTER

Only render relevant proof views per change.

# 22. RECONSTRUCTION GATES
GATE 1 — LAYOUT
- open quad
- separated buildings
- sensible roads
- visible sea
- distributed elevators

GATE 2 — CIRCULATION
- clear player paths
- reachable entrances
- working stairs/ramps
- no dead-end visual traps

GATE 3 — ARCHITECTURE
- raw sharp edges eliminated
- buildings intentionally rounded
- major facilities individually readable

GATE 4 — SOCIAL
- seating
- NPC zones
- gathering space
- roads/sidewalks

GATE 5 — PREMIUM
- premium PBR
- lighting hierarchy
- glass/platinum/crystal coherence
- strong contrast

GATE 6 — PERFORMANCE
- controlled draw calls/materials/lights
- LOD/culling
- no major resource leaks
- stable intended-device performance

# 23. PROJECT_STATE CONTRACT
Maintain:

# WORLD 01 CAMPUS RECONSTRUCTION — CURRENT STATE
ACTIVE PHASE:
CURRENT BEST CHECKPOINT:
LOCKED / PRESERVE:
REMOVED / RELOCATED:
MASTERED:
CURRENT DEFECT:
CURRENT EVIDENCE:
PERFORMANCE STATUS:
NEXT ACTION:
LAST LEARNED RULE:

Keep it compact. It is a save game, not a diary.

# 24. EXECUTION ORDER
P0 — freeze current legitimate world
P1 — remove/relocate giant statues, poles, spikes, center clutter
P2 — establish quad, road loop, facility districts, sea relation
P3 — reposition named facilities
P4 — smaller/frequent elevator network
P5 — roads/sidewalks/stairs
P6 — placeholder buildings + NPC zones
P7 — rounded architectural remodel
P8 — material/lighting
P9 — detail
P10 — sea/dome/world-border polish
P11 — performance/mobile/multiplayer readiness

# 25. DEFINITION OF DONE
WORLD 01 is ready when:
- center reads like a real campus quad
- players have streets/paths/plazas
- named facilities are separate destinations
- NPCs make buildings feel inhabited
- elevators are frequent but not dominant
- stairs/seating/approaches exist
- architecture is rounded and premium
- raw sharp primitive feel is gone
- reflective crystal/glass/metal language is present but controlled
- sea/horizon remain meaningful
- dome scale feels enormous
- accepted systems still function
- performance is acceptable
- world feels like somewhere people could spend hours

The target is not an interesting screenshot.
The target is a **playable civilization**.
