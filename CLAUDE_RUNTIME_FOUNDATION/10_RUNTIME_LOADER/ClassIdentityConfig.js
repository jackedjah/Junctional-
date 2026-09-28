/* MAHWORLD RUNTIME :: CLASS IDENTITY CONFIG
   THE ONE canonical class-colour / iris-colour / eye-canon / head-surface source for runtime code. It does not define colours —
   it reads 02_MATERIAL_CONTRACT/material_zones.json (contract 0.2.0, the same file the Python validators use) and exposes it.
   Phase 4.5 universal MAHBeing canon: eyes are human-like (EYE_SCLERA silver/platinum, EYE_IRIS = CLASS COLOUR, EYE_PUPIL dark,
   EYE_CORNEA reflective), NO standard eye emission. EYE_EMISSION is a SUPERSEDED legacy zone (detected, never reinterpreted).

       var identity = await createClassIdentityConfig(jsonSource);
       identity.irisColor('TITAN')     -> 'BLUE'        (class eye colour = iris colour)
       identity.irisHueBand('ATHLETE') -> [38, 52]
       identity.eyeCanon()             -> 'HUMAN_STANDARD'
       identity.eyeZones()             -> ['EYE_SCLERA','EYE_IRIS','EYE_PUPIL','EYE_CORNEA']
       identity.legacyZones()          -> { EYE_EMISSION: {...SUPERSEDED} }
       identity.headSurfaceStandard()  -> 'PREMIUM_SMOOTH' */

export var CLASS_ORDER = ['TITAN', 'ATHLETE', 'LEAN', 'BAGE', 'VISIONARY'];
export var SEXES = ['F', 'M'];

export function buildClassIdentity(materialZones, variantSchema) {
  if (!materialZones || !materialZones.iris_color_by_class) throw new Error('ClassIdentityConfig: material_zones.json missing iris_color_by_class (contract 0.2.0 required; eye_color_by_class is SUPERSEDED)');
  var iris = materialZones.iris_color_by_class; var r3 = (materialZones.rules && materialZones.rules.R3_eye_structure) || {}; var bands = r3.iris_hue_bands_deg || {};
  var palette = materialZones.class_palette || {}; var zones = materialZones.zones || {}; var legacy = materialZones.legacy_zones || {};
  var locked = (variantSchema && variantSchema.locked_zones) || ['CLASS_COLOR', 'SILVER_METAL', 'GRAPHITE', 'FOREHEAD_DIAMOND', 'CORE_DIAMONDS', 'EYE_SCLERA', 'EYE_PUPIL', 'EYE_CORNEA'];
  CLASS_ORDER.forEach(function (c) { if (!iris[c]) throw new Error('ClassIdentityConfig: no iris colour for ' + c); });
  var U = function (c) { return String(c || '').toUpperCase(); };
  return {
    contractVersion: materialZones.contract_version || 'UNKNOWN',
    classes: function () { return CLASS_ORDER.slice(); },
    sexes: function () { return SEXES.slice(); },
    isClass: function (c) { return CLASS_ORDER.indexOf(U(c)) >= 0; },
    isSex: function (s) { return SEXES.indexOf(U(s)) >= 0; },
    modelId: function (c, s) { return 'MAH_' + U(c) + '_' + U(s); },
    irisColor: function (c) { return iris[U(c)]; },
    classColorName: function (c) { return iris[U(c)]; },   /* class identity colour name == iris colour name */
    irisHueBand: function (c) { return bands[U(c)] ? bands[U(c)].slice() : null; },
    inIrisHueBand: function (c, hueDeg) {
      var b = bands[U(c)]; if (!b || hueDeg === null || hueDeg === undefined) return false;
      return b[0] <= b[1] ? (hueDeg >= b[0] && hueDeg <= b[1]) : (hueDeg >= b[0] || hueDeg <= b[1]);
    },
    palette: function (c) { return palette[U(c)] || null; },   /* null until Astra locks the class palette */
    eyeCanon: function () { return materialZones.eye_canon || 'HUMAN_STANDARD'; },
    eyeRules: function () { return r3; },
    eyeZones: function () { return (r3.required_regions || ['EYE_SCLERA', 'EYE_IRIS', 'EYE_PUPIL', 'EYE_CORNEA']).slice(); },
    legacyZones: function () { return legacy; },
    isLegacyZone: function (z) { return !!legacy[z]; },
    zoneIds: function () { return Object.keys(zones); },
    requiredZones: function () { return Object.keys(zones).filter(function (z) { return zones[z].required; }); },
    zone: function (z) { return zones[z] || null; },
    silverRegions: function () { return (zones.SILVER_METAL && zones.SILVER_METAL.preserved_regions || []).slice(); },
    lockedZones: function () { return locked.slice(); },
    rules: function () { return materialZones.rules || {}; },
    headSurfaceStandard: function () { return (materialZones.head_surface && materialZones.head_surface.standard) || 'PREMIUM_SMOOTH'; },
    headSurface: function () { return materialZones.head_surface || {}; },
    foreheadDiamond: function () { return materialZones.forehead_diamond || {}; },
    facetScope: function () { return materialZones.facet_scope || { applies_to: ['CLASS_COLOR'], excluded: [] }; },
    raw: materialZones
  };
}

export function createClassIdentityConfig(jsonSource) {
  return Promise.all([jsonSource.read('materialZones'), jsonSource.read('variantSchema').catch(function () { return null; })])
    .then(function (r) { return buildClassIdentity(r[0], r[1]); });
}
