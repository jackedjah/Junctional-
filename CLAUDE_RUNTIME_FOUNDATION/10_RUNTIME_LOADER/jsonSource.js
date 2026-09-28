/* MAHWORLD RUNTIME :: JSON SOURCE
   The one place contract data enters the runtime. Every module that needs the manifest, material zones, schemas or the
   animation set asks a JsonSource; nothing hardcodes a copy of that data. In the browser the source fetches static files
   (MAHFITT convention: plain static assets, no bundler); under node it reads the same files from disk so the tests prove
   the contracts against the real JSON. */

export var CONTRACT_FILES = {
  manifest: '01_CHARACTER_MANIFEST/CHARACTER_MASTER_MANIFEST.json',
  manifestSchema: '01_CHARACTER_MANIFEST/CHARACTER_MASTER_MANIFEST.schema.json',
  materialZones: '02_MATERIAL_CONTRACT/material_zones.json',
  creatorSchema: '03_CHARACTER_CREATOR/character_creator.schema.json',
  variantSchema: '03_CHARACTER_CREATOR/CHARACTER_VARIANT_SCHEMA.json',
  animationSet: '05_ANIMATION_CONTRACT/animation_set.json',
  bindingSchema: '05_ANIMATION_CONTRACT/ANIMATION_BINDING_SCHEMA.json',
  visualSchema: '07_VALIDATION_TOOLS/RUNTIME_VISUAL_VALIDATION_SCHEMA.json',
  runtimeConfig: '../CLAUDE_DUAL_LOCOMOTION/15_RUNTIME_DESIGN/config/runtime_config.default.json'
};

/* Browser: fetch relative to the foundation root the page is served from. */
export function createFetchJsonSource(rootUrl, fetchImpl) {
  var f = fetchImpl || (typeof fetch === 'function' ? fetch : null);
  if (!f) throw new Error('jsonSource: no fetch available');
  var cache = {};
  return {
    read: function (key) {
      var rel = CONTRACT_FILES[key] || key;
      if (cache[rel]) return cache[rel];
      cache[rel] = f(rootUrl.replace(/\/$/, '') + '/' + rel, { cache: 'no-store' }).then(function (r) {
        if (!r.ok) throw new Error('jsonSource: ' + rel + ' -> HTTP ' + r.status);
        return r.json();
      });
      return cache[rel];
    }
  };
}

/* Node / tests: synchronous disk reads wrapped in resolved promises so both sources share one async API. */
export function createFsJsonSource(rootDir, fs, path) {
  var cache = {};
  return {
    read: function (key) {
      var rel = CONTRACT_FILES[key] || key;
      if (!cache[rel]) {
        var p = path.resolve(rootDir, rel);
        cache[rel] = Promise.resolve().then(function () { return JSON.parse(fs.readFileSync(p, 'utf8')); });
      }
      return cache[rel];
    },
    readSync: function (key) {
      var rel = CONTRACT_FILES[key] || key;
      return JSON.parse(fs.readFileSync(path.resolve(rootDir, rel), 'utf8'));
    }
  };
}

/* Tests and hosts may also hand in already-parsed objects. */
export function createMemoryJsonSource(map) {
  return { read: function (key) { return key in map ? Promise.resolve(map[key]) : Promise.reject(new Error('jsonSource: no entry ' + key)); }, readSync: function (key) { return map[key]; } };
}
