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
  boarding_s: 1,
  ground_dock: Object.freeze({ x: 22.7, z: 40, altitude_m: 0 }),
  upper_dock: Object.freeze({ x: 22.7, z: 40, altitude_m: 240 }),
  carrier: Object.freeze({ id: 'MAH_ASCENT_CABIN', half_width_m: 1.72, half_depth_m: 1.62, clear_height_m: 3.15, rider_anchor: Object.freeze({ x: 0, y: 0, z: 0 }), door_width_m: 1.55 }),
  guide: Object.freeze({ x: 34, z: 49, altitude_m: 240 }),
  body_radius_m: 0.45,
  body_height_m: 1.7,
  shell_margin_m: 1.1
});

/* One human-scale activity court near the upper arrival. The dome/city is not
   scaled again: these are ordinary metre dimensions inside the fixed M7 shell. */
export const HALO_PLAY_LAYOUT = Object.freeze({
  contract: 'HALO_PLAY_V1',
  center: Object.freeze({ x: 51, z: 40, altitude_m: 240 }),
  half_length_m: 8,
  half_width_m: 4.3,
  net_height_m: 2.15,
  ball_radius_m: 0.22,
  entry: Object.freeze({ x: 42.2, z: 40, altitude_m: 240, range_m: 3.2 }),
  player_start: Object.freeze({ x: 45.6, z: 40, altitude_m: 240 }),
  bot_start: Object.freeze({ x: 56.4, z: 40, altitude_m: 240 }),
  targets: Object.freeze([
    Object.freeze({ id: 'LEFT', x: 56.7, z: 37.8, radius_m: 1.15 }),
    Object.freeze({ id: 'CENTER', x: 57.4, z: 40, radius_m: 1.15 }),
    Object.freeze({ id: 'RIGHT', x: 56.7, z: 42.2, radius_m: 1.15 })
  ])
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

/* Shared swept radial constraint used by the authority and its isolated boundary fixture.
   WORLD is constrained only when a segment actually crosses from outside the closed shell;
   HALO is always constrained to the capsule-safe interior. */
export function haloBoundaryConstraint(domain, altitudeM, from, to) {
  const y = Number(altitudeM || 0), tx = Number(to && to.x || 0), tz = Number(to && to.z || 0);
  const dx = tx - HALO_LAYOUT.center.x, dz = tz - HALO_LAYOUT.center.z, d = Math.hypot(dx, dz);
  let limit = null, keepOutside = false;
  if (domain === 'HALO') limit = Math.min(HALO_LAYOUT.playable_radius_m, haloInteriorRadiusAt(y));
  else if (domain === 'WORLD' && y >= HALO_LAYOUT.arrival_height_m && y <= HALO_LAYOUT.apex_height_m) {
    const sy = y - HALO_LAYOUT.arrival_height_m;
    const shell = Math.sqrt(Math.max(0, HALO_LAYOUT.shell_radius_m * HALO_LAYOUT.shell_radius_m - sy * sy)) + HALO_LAYOUT.body_radius_m;
    const fd = haloRadialDistance(from && from.x, from && from.z);
    if (fd >= shell - 0.001 && d < shell) { limit = shell; keepOutside = true; }
  }
  if (limit === null || (!keepOutside && d <= limit) || (keepOutside && d >= limit)) return null;
  const ux = d > 1e-6 ? dx / d : 1, uz = d > 1e-6 ? dz / d : 0;
  return { x: HALO_LAYOUT.center.x + ux * limit, z: HALO_LAYOUT.center.z + uz * limit, ux: ux, uz: uz, radius_m: limit, kind: keepOutside ? 'OUTSIDE_SHELL' : 'INSIDE_SHELL' };
}
