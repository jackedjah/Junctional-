/* MAHWORLD GAMEPLAY RUNTIME :: WORLD / REGION DATA MODEL + POI REGISTRY (data-driven; no maps, no art)
   World: world_id · name · environment_profile · architecture_profile · nature_profile · transport_profile · shared_infrastructure ·
   activity_locations · mentor_locations · wild_monster_set · ultimate_boss · raid_zones · spawn_points · pois.
   POI types: GYM · DUEL_ARENA (MAH_MATCH) · MENTOR · ACTIVITY · TRANSPORT · RAID · SHOP_FUTURE · SOCIAL_SPACE · BUILDING_INTERIOR · WORLD_EXIT (travel node).
   Interaction points are derived from POIs (poiToInteraction) so the world data drives the interaction system without duplication. */
export var POI_TYPES = ['GYM', 'DUEL_ARENA', 'MENTOR', 'ACTIVITY', 'TRANSPORT', 'RAID', 'SHOP_FUTURE', 'SOCIAL_SPACE', 'BUILDING_INTERIOR', 'WORLD_EXIT'];
var REQUIRED_WORLD = ['world_id', 'name', 'environment_profile', 'architecture_profile', 'nature_profile', 'transport_profile', 'shared_infrastructure', 'activity_locations', 'mentor_locations', 'wild_monster_set', 'ultimate_boss', 'raid_zones', 'spawn_points', 'pois'];
var POI_TO_INTERACTION = { GYM: 'GYM', DUEL_ARENA: 'DUEL', MENTOR: 'MENTOR', ACTIVITY: 'ACTIVITY', TRANSPORT: 'TRANSPORT', RAID: 'RAID', BUILDING_INTERIOR: 'DOOR', WORLD_EXIT: 'TRANSPORT', SOCIAL_SPACE: null, SHOP_FUTURE: null };

export function validateWorld(w, catalog) {
  var e = []; REQUIRED_WORLD.forEach(function (k) { if (!(k in w)) e.push(w.world_id + ': missing ' + k); });
  (w.shared_infrastructure || []).forEach(function (s) { if (catalog && !catalog[s]) e.push(w.world_id + ': unknown shared infrastructure ' + s); });
  if (!(w.spawn_points || []).some(function (s) { return s.default; })) e.push(w.world_id + ': no default spawn');
  (w.pois || []).forEach(function (p) { if (POI_TYPES.indexOf(p.type) < 0) e.push(w.world_id + ': bad poi type ' + p.type); if (!p.position) e.push(w.world_id + ': poi ' + p.poi_id + ' has no position'); if (p.type === 'WORLD_EXIT' && !p.destination_world) e.push(w.world_id + ': exit without destination'); });
  if (w.wild_monster_set && (w.wild_monster_set.monsters || []).length) e.push(w.world_id + ': monsters defined — Phase 4 boundary forbids monster creation');
  return e;
}
export function poiToInteraction(poi, world) {
  var t = POI_TO_INTERACTION[poi.type]; if (!t) return null;
  var pt = { interaction_id: poi.poi_id, type: t, position: poi.position, prompt: (t === 'DOOR' ? 'ENTER ' : t === 'TRANSPORT' ? 'TRAVEL ' : t + ' ') + poi.poi_id, poi_type: poi.type, world_id: world.world_id, requirements: {} };
  if (poi.interior_id) pt.interior_id = poi.interior_id; if (poi.destination_world) pt.destination = poi.destination_world; if (poi.activity_type) pt.activity_type = poi.activity_type; if (poi.mentor_id) pt.mentor_id = poi.mentor_id;
  if (t === 'ACTIVITY' && poi.activity_type === 'CLIMBING') { pt.type = 'CLIMB'; pt.requirements = { form: 'SPLIT', grounded: true }; pt.prompt = 'CLIMB ' + poi.poi_id; }
  if (t === 'DOOR') pt.requirements = { grounded: true, not_in_combat: true }; if (t === 'DUEL') pt.requirements = { not_in_combat: true };
  return pt;
}
export function createWorldRegistry(data) {
  if (!data || !Array.isArray(data.worlds)) throw new Error('world data has no worlds'); var catalog = data.shared_infrastructure_catalog || {}; var byId = {}; var errs = [];
  data.worlds.forEach(function (w) { var e = validateWorld(w, catalog); if (e.length) errs = errs.concat(e); byId[w.world_id] = w; });
  data.worlds.forEach(function (w) { (w.pois || []).forEach(function (p) { if (p.type === 'WORLD_EXIT' && !byId[p.destination_world]) errs.push(w.world_id + ': exit to unknown world ' + p.destination_world); }); });
  if (errs.length) throw new Error('world data invalid: ' + errs.slice(0, 5).join('; '));
  return {
    classification: data.classification || 'UNKNOWN', ids: function () { return Object.keys(byId); }, get: function (id) { return byId[id] || null; }, catalog: function () { return JSON.parse(JSON.stringify(catalog)); },
    defaultSpawn: function (id) { var w = byId[id]; return w ? (w.spawn_points.filter(function (s) { return s.default; })[0] || null) : null; },
    pois: function (id, type) { var w = byId[id]; return w ? w.pois.filter(function (p) { return !type || p.type === type; }) : []; },
    poi: function (worldId, poiId) { return this.pois(worldId).filter(function (p) { return p.poi_id === poiId; })[0] || null; },
    interactionPoints: function (id) { var w = byId[id]; return w ? w.pois.map(function (p) { return poiToInteraction(p, w); }).filter(Boolean) : []; },
    sharedAcross: function (infra) { return Object.keys(byId).filter(function (id) { return byId[id].shared_infrastructure.indexOf(infra) >= 0; }); },
    travelTargets: function (id) { return this.pois(id, 'WORLD_EXIT').map(function (p) { return p.destination_world; }); }
  };
}
