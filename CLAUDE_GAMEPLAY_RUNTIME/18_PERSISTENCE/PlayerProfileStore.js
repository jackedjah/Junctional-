/* MAHWORLD GAMEPLAY RUNTIME :: PLAYER SAVE / PROFILE SYSTEM (local development persistence only; no accounts, no backend)
   Versioned persisted profile (schema_version from dev tuning persistence.schema_version = 1.0.0):
     player_id · selected_character_class · selected_sex · level · xp · permanent_stats · mentor_progress · activity_progress · unlocks ·
     settings · future_cosmetic_selections · last_world · last_spawn · schema_version (+ created_at / saved_at)
   Temporary buffs are NEVER persisted (validate refuses them). Operations: newProfile · save · load · validate · migrate · resetDevelopment.
   Storage adapters: memory (tests), localStorage (browser), file (node) — all keyed by persistence.storage_key_prefix + player_id. */
export var PROFILE_SCHEMA_VERSION = '1.0.0';
var CLASSES = ['TITAN', 'ATHLETE', 'LEAN', 'BAGE', 'VISIONARY'];
var REQUIRED = ['player_id', 'selected_character_class', 'selected_sex', 'level', 'xp', 'permanent_stats', 'mentor_progress', 'activity_progress', 'unlocks', 'settings', 'future_cosmetic_selections', 'last_world', 'last_spawn', 'schema_version'];

export function createMemoryStorage() { var m = {}; return { getItem: function (k) { return k in m ? m[k] : null; }, setItem: function (k, v) { m[k] = String(v); }, removeItem: function (k) { delete m[k]; }, keys: function () { return Object.keys(m); } }; }
export function createFileStorage(fs, path, dir) { fs.mkdirSync(dir, { recursive: true }); var f = function (k) { return path.join(dir, k.replace(/[^A-Za-z0-9._-]/g, '_') + '.json'); }; return { getItem: function (k) { return fs.existsSync(f(k)) ? fs.readFileSync(f(k), 'utf8') : null; }, setItem: function (k, v) { fs.writeFileSync(f(k), String(v)); }, removeItem: function (k) { if (fs.existsSync(f(k))) fs.unlinkSync(f(k)); }, keys: function () { return fs.readdirSync(dir).filter(function (n) { return /\.json$/.test(n); }).map(function (n) { return n.replace(/\.json$/, ''); }); } }; }

/* migrations: each step upgrades exactly one version; unknown / newer versions are refused */
export var MIGRATIONS = {
  '0.9.0': { to: '1.0.0', note: 'dev pre-release: stats->permanent_stats, mentors->mentor_progress, class->selected_character_class, sex->selected_sex; adds unlocks/settings/cosmetics/last_world/last_spawn', up: function (old) { return { player_id: old.player_id || old.id || 'dev', selected_character_class: old.selected_character_class || old.class || 'ATHLETE', selected_sex: old.selected_sex || old.sex || 'F', level: old.level || 1, xp: old.xp || 0, permanent_stats: old.permanent_stats || old.stats || {}, mentor_progress: old.mentor_progress || { accepted: [], completed: old.mentors || [] }, activity_progress: old.activity_progress || { joined: [], completed: [] }, unlocks: old.unlocks || [], settings: old.settings || {}, future_cosmetic_selections: old.future_cosmetic_selections || {}, last_world: old.last_world || null, last_spawn: old.last_spawn || null, schema_version: '1.0.0', created_at: old.created_at || null, saved_at: old.saved_at || null, migrated_from: '0.9.0' }; } }
};

export function validateProfile(p) {
  var e = []; if (!p || typeof p !== 'object') return ['profile is not an object'];
  REQUIRED.forEach(function (k) { if (!(k in p)) e.push('missing ' + k); });
  if (p.schema_version !== PROFILE_SCHEMA_VERSION) e.push('schema_version ' + p.schema_version + ' != ' + PROFILE_SCHEMA_VERSION + (MIGRATIONS[p.schema_version] ? ' (migratable)' : ' (unknown)'));
  if (CLASSES.indexOf(p.selected_character_class) < 0) e.push('invalid class'); if (p.selected_sex !== 'F' && p.selected_sex !== 'M') e.push('invalid sex');
  if (typeof p.level !== 'number' || p.level < 1) e.push('bad level'); if (typeof p.xp !== 'number' || p.xp < 0) e.push('bad xp');
  if (p.permanent_stats && typeof p.permanent_stats === 'object') Object.keys(p.permanent_stats).forEach(function (k) { if (typeof p.permanent_stats[k] !== 'number') e.push('non-numeric stat ' + k); });
  if ('temporary_buffs' in p || 'active_buffs' in p || 'buffs' in p) e.push('temporary buffs must never be persisted as progression');
  if (p.mentor_progress && (!Array.isArray(p.mentor_progress.accepted) || !Array.isArray(p.mentor_progress.completed))) e.push('bad mentor_progress');
  return e;
}

export function createProfileStore(cfg, storage, bus) {
  var prefix = cfg.dev('persistence.storage_key_prefix'); var version = cfg.dev('persistence.schema_version'); if (version !== PROFILE_SCHEMA_VERSION) throw new Error('persistence schema version mismatch');
  function emit(n, p) { if (bus) bus.emit(n, p); }
  var api = {
    version: version,
    newProfile: function (o) { var p = { player_id: o.player_id || 'dev', selected_character_class: o.classId, selected_sex: o.sex, level: 1, xp: 0, permanent_stats: {}, mentor_progress: { accepted: [], completed: [] }, activity_progress: { joined: [], completed: [] }, unlocks: [], settings: Object.assign({ input_adapter: 'KEYBOARD_MOUSE' }, o.settings || {}), future_cosmetic_selections: { skin_color: 'SKIN_DEFAULT', face_type: 'FACE_DEFAULT', hair_style: 'HAIR_NONE' }, last_world: o.last_world || null, last_spawn: o.last_spawn || null, schema_version: version, created_at: o.now || null, saved_at: null }; var e = validateProfile(p); if (e.length) throw new Error('new profile invalid: ' + e.join('; ')); emit('PROFILE_CREATED', { player_id: p.player_id }); return p; },
    /* capture the PERMANENT part of a live gameplay profile; buffs are ignored by construction */
    fromGameplay: function (persisted, gp, ctx) { var p = JSON.parse(JSON.stringify(persisted)); p.level = gp.level; p.xp = gp.xp; p.permanent_stats = Object.assign({}, gp.stats || {}); p.mentor_progress = { accepted: gp.mentor_progress.accepted.slice(), completed: gp.mentor_progress.completed.slice() }; p.activity_progress = { joined: gp.activity_progress.joined.slice(), completed: gp.activity_progress.completed.slice() }; p.future_cosmetic_selections = Object.assign({}, gp.cosmetics && { skin_color: gp.cosmetics.skin_color, face_type: gp.cosmetics.face_type, hair_style: gp.cosmetics.hair_style }); if (ctx) { if (ctx.last_world) p.last_world = ctx.last_world; if (ctx.last_spawn) p.last_spawn = ctx.last_spawn; if (ctx.unlocks) p.unlocks = ctx.unlocks.slice(); } return p; },
    applyToGameplay: function (persisted, gp) { gp.level = persisted.level; gp.xp = persisted.xp; gp.stats = Object.assign({}, persisted.permanent_stats); gp.mentor_progress = { accepted: persisted.mentor_progress.accepted.slice(), completed: persisted.mentor_progress.completed.slice() }; gp.activity_progress = { joined: persisted.activity_progress.joined.slice(), completed: persisted.activity_progress.completed.slice() }; return gp; },
    save: function (p, now) { var e = validateProfile(p); if (e.length) return { ok: false, reason: 'INVALID', errors: e }; p.saved_at = now === undefined ? null : now; storage.setItem(prefix + p.player_id, JSON.stringify(p)); emit('PROFILE_SAVED', { player_id: p.player_id, level: p.level, xp: p.xp }); return { ok: true, key: prefix + p.player_id }; },
    load: function (playerId) { var raw = storage.getItem(prefix + playerId); if (raw === null) return { ok: false, reason: 'NOT_FOUND' }; var p; try { p = JSON.parse(raw); } catch (x) { return { ok: false, reason: 'CORRUPT', detail: String(x.message || x) }; } var m = api.migrate(p); if (!m.ok) return m; var e = validateProfile(m.profile); if (e.length) return { ok: false, reason: 'INVALID', errors: e }; emit('PROFILE_LOADED', { player_id: playerId, migrated: m.migrated }); return { ok: true, profile: m.profile, migrated: m.migrated }; },
    migrate: function (p) { var steps = []; var cur = p; var guard = 0; while (cur && cur.schema_version !== PROFILE_SCHEMA_VERSION && guard++ < 10) { var m = MIGRATIONS[cur.schema_version]; if (!m) return { ok: false, reason: 'UNKNOWN_SCHEMA_VERSION', version: cur.schema_version }; cur = m.up(cur); steps.push(m.to); } if (steps.length) emit('PROFILE_MIGRATED', { from: p.schema_version, steps: steps }); return { ok: true, profile: cur, migrated: steps }; },
    validate: validateProfile,
    resetDevelopment: function (playerId) { storage.removeItem(prefix + playerId); emit('PROFILE_RESET', { player_id: playerId }); return { ok: true }; },
    list: function () { return storage.keys().filter(function (k) { return k.indexOf(prefix) === 0; }).map(function (k) { return k.slice(prefix.length); }); }
  }; return api;
}
