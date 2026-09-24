REJECTED INTERMEDIATE — do not load.
Mah_Athlete_M_v3.glb is the Blender 4.5 export of the rig-repair attempt. Its joint placement is correct, but the file is
unusable in the runtime: the glTF exporter wrote skins:0 (the mesh carries JOINTS_0/WEIGHTS_0 but no skin, so Three.js
renders it unskinned), the two body primitives merged into one (which breaks the fused_lower / upper role split that
SPLIT form needs), and Blender's bone-heat solver had assigned zero weights to every vertex while still reporting FINISHED.
Kept only as evidence for the handoff. The delivered asset is ../Mah_Athlete_M_am08_v3.glb, built by make_class_rig_v3.mjs.
