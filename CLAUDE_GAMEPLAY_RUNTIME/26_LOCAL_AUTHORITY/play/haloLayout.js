/* M7 HALO scale/access authority. Applied once from the accepted 24 m / 8.2 m M7 baseline. */
export const HALO_LAYOUT = Object.freeze({
  contract: 'M7_HALO_SCALE_ACCESS_V1',
  center: Object.freeze({ x: 30, z: 40 }),
  base_y_m: 0,
  base_radius_m: 6.2,
  baseline: Object.freeze({ arrival_height_m: 24, dome_radius_m: 8.2, dome_diameter_m: 16.4 }),
  scale: Object.freeze({ arrival_height: 10, dome_linear: 18 }),
  arrival_height_m: 240,
  shell_radius_m: 147.6,
  shell_diameter_m: 295.2,
  structural_deck_radius_m: 153,
  playable_radius_m: 144.8,
  apex_height_m: 387.6,
  travel_s: 20,
  ground_dock: Object.freeze({ x: 22.7, z: 40, altitude_m: 0 }),
  upper_dock: Object.freeze({ x: 22.7, z: 40, altitude_m: 240 }),
  guide: Object.freeze({ x: 34, z: 49, altitude_m: 240 }),
  body_radius_m: 0.45,
  body_height_m: 1.7,
  shell_margin_m: 1.1
});

export function haloRadialDistance(x, z) {
  return Math.hypot(Number(x || 0) - HALO_LAYOUT.center.x, Number(z || 0) - HALO_LAYOUT.center.z);
}

export function haloInteriorRadiusAt(altitudeM) {
  const y = Math.max(0, Number(altitudeM || 0) - HALO_LAYOUT.arrival_height_m + HALO_LAYOUT.body_height_m);
  const r = HALO_LAYOUT.shell_radius_m - HALO_LAYOUT.shell_margin_m;
  return Math.max(0, Math.sqrt(Math.max(0, r * r - y * y)) - HALO_LAYOUT.body_radius_m);
}

export function haloInteriorCeilingAt(x, z) {
  const r = HALO_LAYOUT.shell_radius_m - HALO_LAYOUT.shell_margin_m;
  const d = Math.min(r, haloRadialDistance(x, z) + HALO_LAYOUT.body_radius_m);
  return HALO_LAYOUT.arrival_height_m + Math.sqrt(Math.max(0, r * r - d * d)) - HALO_LAYOUT.body_height_m;
}

export function haloContainsActor(x, z, altitudeM) {
  const y = Number(altitudeM || 0);
  if (y < HALO_LAYOUT.arrival_height_m - 0.001) return false;
  return haloRadialDistance(x, z) <= haloInteriorRadiusAt(y) + 0.001;
}
