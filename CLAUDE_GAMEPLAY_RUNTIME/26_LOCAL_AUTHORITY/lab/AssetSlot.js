/* MAHWORLD PLAYABLE SAMPLE :: REUSABLE CHARACTER SLOT (development only)
   One slot, per-asset bindings, one presentation adapter surface. The slot validates a GAME-TEST EXPORT manifest (a released, versioned
   export declared by the owner / project contract — never a scan of Astra's work tree), tries the binding's loader, and falls back to the
   code-generated STAND-IN with a VISIBLE reason when anything is missing, invalid or fails to load. Gameplay stays authoritative: the slot
   only decides which presentation implementation renders an entity. Nothing here reads native Blender / Reallusion files.
   Status 2026-09-14: no released GAME-TEST EXPORT exists in the project → the stand-in is the only binding; native appearance / rig checks PENDING. */
export var MANIFEST_SCHEMA = {
  version: 'GAME_TEST_EXPORT_MANIFEST_DEV_0.1',
  required: ['export_id', 'version', 'sha256', 'owner_review_status', 'source_release', 'units', 'up_axis', 'forward_axis', 'root', 'scale_to_metres', 'forms', 'clips', 'sockets', 'materials', 'files'],
  owner_review_status: ['CANDIDATE', 'OWNER_REVIEWED', 'OWNER_APPROVED'],   /* a candidate is never promoted here */
  forms: ['FUSED', 'SPLIT'], required_clips: ['IDLE', 'WALK', 'RUN', 'DASH', 'GUARD_PHYSICAL', 'GUARD_MAGICAL', 'ATTACK_CONTACT', 'ATTACK_MANIFESTATION', 'TRANSFORM_TO_SPLIT', 'TRANSFORM_TO_FUSED', 'FLY_IDLE', 'FLY_MOVE', 'LAND', 'LAND_FORCED', 'HIT', 'KO'],
  required_sockets: ['ROOT', 'HEAD', 'CHEST', 'HAND_L', 'HAND_R', 'FEET'], units: ['metres'], up_axis: ['+Y'], forward_axis: ['-Z']
};
export function validateManifest(m) {
  var missing = [], problems = []; if (!m || typeof m !== 'object') return { ok: false, missing: MANIFEST_SCHEMA.required.slice(), problems: ['NOT_AN_OBJECT'], unsupported: {} };
  MANIFEST_SCHEMA.required.forEach(function (k) { if (m[k] === undefined || m[k] === null) missing.push(k); });
  if (m.owner_review_status !== undefined && MANIFEST_SCHEMA.owner_review_status.indexOf(m.owner_review_status) < 0) problems.push('BAD_OWNER_REVIEW_STATUS');
  if (m.units !== undefined && MANIFEST_SCHEMA.units.indexOf(m.units) < 0) problems.push('UNITS_NOT_METRES'); if (m.up_axis !== undefined && MANIFEST_SCHEMA.up_axis.indexOf(m.up_axis) < 0) problems.push('UP_AXIS_NOT_+Y'); if (m.forward_axis !== undefined && MANIFEST_SCHEMA.forward_axis.indexOf(m.forward_axis) < 0) problems.push('FORWARD_AXIS_NOT_-Z');
  if (m.scale_to_metres !== undefined && !(typeof m.scale_to_metres === 'number' && m.scale_to_metres > 0 && isFinite(m.scale_to_metres))) problems.push('BAD_SCALE');
  if (m.sha256 !== undefined && !/^[0-9a-f]{64}$/i.test(String(m.sha256))) problems.push('BAD_SHA256');
  var unsupported = { forms: [], clips: [], sockets: [] }; if (Array.isArray(m.forms)) MANIFEST_SCHEMA.forms.forEach(function (f) { if (m.forms.indexOf(f) < 0) unsupported.forms.push(f); }); else if (m.forms !== undefined) problems.push('FORMS_NOT_ARRAY');
  if (m.clips && typeof m.clips === 'object') MANIFEST_SCHEMA.required_clips.forEach(function (c) { if (!m.clips[c]) unsupported.clips.push(c); }); else if (m.clips !== undefined) problems.push('CLIPS_NOT_OBJECT');
  if (m.sockets && typeof m.sockets === 'object') MANIFEST_SCHEMA.required_sockets.forEach(function (c) { if (!m.sockets[c]) unsupported.sockets.push(c); }); else if (m.sockets !== undefined) problems.push('SOCKETS_NOT_OBJECT');
  if (m.files !== undefined && (!Array.isArray(m.files) || !m.files.length || m.files.some(function (f) { return typeof f !== 'string' || /\.\.|^\/|^[A-Za-z]:|\.blend$|\.py$/i.test(f); }))) problems.push('FILES_INVALID (relative, no native sources)');
  return { ok: missing.length === 0 && problems.length === 0, missing: missing, problems: problems, unsupported: unsupported, review_status: m.owner_review_status || null, approved_final: false };
}
/* createCharacterSlot: one slot per view; bindings = { STAND_IN: { create(adapterFactoryArgs) }, <export_id>: { manifest, create } }.
   select(id) validates, loads, disposes the previous implementation, and falls back visibly. */
export function createCharacterSlot(deps) {
  var d = deps || {}; var bindings = {}; var current = null; var history = [];
  function standIn(reason) { var impl = d.standIn(); current = { id: 'STAND_IN', impl: impl, manifest: null, fallback_reason: reason || null, label_suffix: reason ? ' (STAND-IN fallback: ' + reason + ')' : '' }; history.push({ id: 'STAND_IN', reason: reason || null }); return current; }
  var api = {
    register: function (id, binding) { bindings[id] = binding; return api; }, current: function () { return current; }, history: function () { return history.slice(); }, ids: function () { return ['STAND_IN'].concat(Object.keys(bindings)); },
    select: async function (id) {
      if (current && current.impl && current.impl.dispose) { try { current.impl.dispose(); } catch (e) { /* disposal must never block a switch */ } }
      if (!id || id === 'STAND_IN') return standIn(null); var b = bindings[id]; if (!b) return standIn('UNKNOWN_BINDING ' + id);
      var v = validateManifest(b.manifest); if (!v.ok) return standIn('MANIFEST_INVALID ' + (v.missing.length ? 'missing ' + v.missing.join(',') : '') + (v.problems.length ? ' ' + v.problems.join(',') : ''));
      try { var impl = await b.create(b.manifest); if (!impl || typeof impl.update !== 'function' || typeof impl.mount !== 'function' || typeof impl.dispose !== 'function') return standIn('BINDING_NOT_AN_ADAPTER'); current = { id: id, impl: impl, manifest: b.manifest, validation: v, fallback_reason: null, label_suffix: ' [' + id + ' ' + b.manifest.version + ' ' + b.manifest.owner_review_status + ']' }; history.push({ id: id, reason: null, unsupported: v.unsupported }); return current; }
      catch (e) { return standIn('LOAD_FAILED ' + String(e && e.message || e).slice(0, 80)); }
    },
    dispose: function () { if (current && current.impl && current.impl.dispose) current.impl.dispose(); current = null; }
  };
  return api;
}
