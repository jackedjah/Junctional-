/* MAHWORLD :: MAHGIC TREE — authored family definition (master §14). Every number here is an authored, reversible design value for the
   PROTOTYPE (status below); nothing was learned from the three-game archive. The scale reference is measured from the actual rig, not a screenshot. */
export var TREE_SPEC = {
  version: 'MAHGIC_TREE_SPEC_V1', status: 'PROTOTYPE — one specimen + a small cluster for Jah\'s verdict (master §14.5 / U11); NOT the map family yet',
  /* scale (master §14.3): reference body dev_0.14 ATHLETE_M_V9, neutral grounded pose, measured on the rig's rest skeleton (mocap/clip_io.mjs restSkeleton →
     joint world heights above the body's lowest point; fused + grounded ⇒ hoverLift 0): PELVIS 0.765 m, THIGH (femoral head) 0.835 m, crotch (authored split
     line) 0.730 m, head top 1.800 m. The normal specimen's crown top is authored at 0.80 m (inside the 0.765–0.835 m hip band) with ±0.06 m authored variation
     across the three variants; per-instance scale in the registry stays within 0.97–1.03 so a cluster never leaves the band by more than a few centimetres. */
  scale_reference: { body: 'dev_0.14 ATHLETE_M_V9 (Mah_Athlete_M_am08_v6.glb sha256 7d217d0f…)', pose: 'neutral grounded rest pose, fused, hoverLift 0 (no hover bob, no trails)', pelvis_joint_m: 0.765, femoral_head_joint_m: 0.835, crotch_m: 0.730, head_top_m: 1.800, method: 'restSkeleton FK of the shipped GLB (scale_to_metres 1.82461), lowest mesh point = 0' },
  crown_top_m: 0.80, crown_variation_m: 0.03, hip_band_m: [0.765, 0.835],
  trunk_fraction: 0.34, trunk_radius_m: 0.056, bed_radius_m: 0.16,
  primaries_min: 4, primaries_max: 5, primary_elevation_rad: [0.5, 0.9], primary_length_fraction: [0.5, 0.62], secondary_length_fraction: [0.5, 0.65], twig_length_fraction: [0.4, 0.55],
  leaf_length_m: 0.08, leaf_width_m: 0.04, gem_tip_fraction: 0.35, gem_radius_m: 0.0085,
  sway_amplitude_m: 0.011, leaf_flutter_m: 0.0016,
  branch_color: 0xaeb8c4, leaf_color: 0xd4dce8, gem_color: 0xeaf9ff, energy_color: 0xffc862, energy_day: 0.22, energy_night: 0.8,
  variant_seeds: [1201, 2207, 3301],
  lod_far: { switch_m: 30, twigs: false, mid_leaves: false, terminal_leaf_fraction: 0.5, radial_scale: 0.6, gems: false, note: 'DEFINITION for the propagation step (U15): the far variant of each seed keeps the trunk / primaries / secondaries and half the terminal leaf fans; no twigs, no mid-branch leaves, no gems; the crown top and the seed-driven silhouette are the same' },
  collision: 'NONE — decorative hip-height foliage: walk-through, the camera boom ignores it (master §14.6: no camera shove, no trapped players)',
  interaction: 'NONE — no harvesting / loot / healing / crafting / resource generation (U16)'
};
