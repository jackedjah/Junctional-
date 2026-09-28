/* MAHWORLD RUNTIME :: CHARACTER REGISTRY
   The ten canonical base characters (5 classes x 2 sexes), built from CHARACTER_MASTER_MANIFEST.json (manifest 0.2.0). Every
   readiness value is DERIVED from manifest evidence; nothing here upgrades a status. Unknown stays UNKNOWN, unready stays NOT_READY.
   Phase 4.5: iris colour (= class colour), eye system (HUMAN_STANDARD / LEGACY_GLOW / UNMAPPED / UNKNOWN), head-surface standard
   certification, forehead-diamond metadata and the derived class-colour facet status are part of every entry.

       var registry = await createCharacterRegistry(jsonSource, identity);
       registry.resolve('Athlete', 'Female')   -> entry | throws on an invalid class/sex
       registry.get('MAH_TITAN_M')             -> entry
       registry.all()                          -> 10 entries in canon order */

import { CLASS_ORDER, SEXES } from './ClassIdentityConfig.js';

var SEX_ALIASES = { F: 'F', FEMALE: 'F', M: 'M', MALE: 'M' };
var READY_SOURCE = ['APPROVED', 'FROZEN'];
var FACET_TO_CLASS_COLOR = { NOT_STARTED: 'NONE', UNKNOWN: 'NONE', CANDIDATE: 'PENDING', REVISE: 'PENDING', KEEP_CURRENT: 'APPROVED', KEEP_FACET_PASS: 'APPROVED', ROLLBACK: 'APPROVED' };

export function normalizeSex(s) { return SEX_ALIASES[String(s || '').toUpperCase()] || null; }
export function normalizeClass(c) { var u = String(c || '').toUpperCase(); return CLASS_ORDER.indexOf(u) >= 0 ? u : null; }

function assetStatus(m) {
  var rs = m.runtime_source || {};
  if (!rs.path || !rs.sha256) return 'NOT_READY';
  if (READY_SOURCE.indexOf(rs.status) >= 0 && m.retopo_status === 'RUNTIME_READY') {
    /* Phase 4.5: a superseded glowing-eye asset can never be READY without an explicit waiver */
    if (m.eye_system === 'LEGACY_GLOW' && !m.eye_legacy_waiver) return 'LEGACY_EYE_SYSTEM';
    return 'READY';
  }
  if (rs.status === 'PREPARED' || rs.status === 'RETAINED') return 'PREPARED';
  return 'NOT_READY';
}

export function buildRegistry(manifest, identity) {
  if (!manifest || !Array.isArray(manifest.models)) throw new Error('characterRegistry: manifest has no models');
  var entries = {};
  manifest.models.forEach(function (m) {
    var id = m.id; if (!/^MAH_(TITAN|ATHLETE|LEAN|BAGE|VISIONARY)_(F|M)$/.test(id)) throw new Error('characterRegistry: bad model id ' + id);
    if ('eye_color' in m || (m.material_zones && 'EYE_EMISSION' in m.material_zones)) throw new Error('characterRegistry: ' + id + ' uses the SUPERSEDED eye_color / EYE_EMISSION manifest fields (manifest 0.2.0 required)');
    var expectedIris = identity ? identity.irisColor(m.class) : null; var hs = m.head_surface || {}; var fd = m.forehead_diamond || {};
    entries[id] = {
      id: id, class: m.class, sex: m.sex, displayName: m.class.charAt(0) + m.class.slice(1).toLowerCase() + ' ' + (m.sex === 'F' ? 'Female' : 'Male'),
      visualMasterPath: (m.visual_source && m.visual_source.path) || null, visualMasterSha256: (m.visual_source && m.visual_source.sha256) || null,
      runtimeMasterPath: (m.runtime_source && m.runtime_source.path) || null, runtimeMasterSha256: (m.runtime_source && m.runtime_source.sha256) || null,
      visualLockStatus: (m.visual_source && m.visual_source.status) || 'UNKNOWN',
      runtimeReadyStatus: assetStatus(m),
      semanticMaterials: Object.assign({}, m.material_zones || {}),
      irisColor: m.iris_color, irisColorMatchesClass: expectedIris ? expectedIris === m.iris_color : null,
      eyeSystem: m.eye_system || 'UNKNOWN', eyeLegacyWaiver: m.eye_legacy_waiver || null,
      headSurface: { standard: hs.standard || 'UNKNOWN', certified: hs.certified === undefined ? null : hs.certified, certifiedBy: hs.certified_by || null, date: hs.date || null },
      foreheadDiamond: { present: fd.present || 'UNKNOWN', socket: fd.socket || null, material: fd.material || null, threeD: fd.three_d === undefined ? null : fd.three_d, verticalCertified: fd.vertical_certified === undefined ? null : fd.vertical_certified, centralCertified: fd.central_certified === undefined ? null : fd.central_certified },
      facetStatus: m.facet_status || 'UNKNOWN', classColorFacetStatus: FACET_TO_CLASS_COLOR[m.facet_status || 'UNKNOWN'] || 'NONE',
      rigStatus: m.rig_status || 'UNKNOWN', splitLegReadiness: m.fused_split_readiness || 'UNKNOWN',
      animationReadiness: m.animation_readiness || 'UNKNOWN', characterCreatorReadiness: m.character_creator_readiness || 'UNKNOWN',
      retopoStatus: m.retopo_status || 'UNKNOWN', densityClass: (m.geometry && m.geometry.density_class) || 'UNKNOWN', tris: (m.geometry && m.geometry.tris) || null,
      version: m.version || 'UNKNOWN', hash: m.hash || null, silverExceptions: (m.silver_exceptions || []).slice(), notes: m.notes || ''
    };
  });
  CLASS_ORDER.forEach(function (c) { SEXES.forEach(function (s) { if (!entries['MAH_' + c + '_' + s]) throw new Error('characterRegistry: manifest lacks MAH_' + c + '_' + s); }); });
  var canon = []; CLASS_ORDER.forEach(function (c) { SEXES.forEach(function (s) { canon.push(entries['MAH_' + c + '_' + s]); }); });
  return {
    version: manifest.manifest_version, generated: manifest.generated,
    all: function () { return canon.slice(); },
    ids: function () { return canon.map(function (e) { return e.id; }); },
    get: function (id) { return entries[id] || null; },
    resolve: function (cls, sex) {
      var c = normalizeClass(cls), s = normalizeSex(sex);
      if (!c) throw new Error('characterRegistry: invalid class ' + JSON.stringify(cls));
      if (!s) throw new Error('characterRegistry: invalid sex ' + JSON.stringify(sex));
      return entries['MAH_' + c + '_' + s];
    },
    readyIds: function () { return canon.filter(function (e) { return e.runtimeReadyStatus === 'READY'; }).map(function (e) { return e.id; }); }
  };
}

export function createCharacterRegistry(jsonSource, identity) {
  return jsonSource.read('manifest').then(function (man) { return buildRegistry(man, identity); });
}
