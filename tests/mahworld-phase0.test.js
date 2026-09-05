'use strict';
/* MAHWORLD PHASE 0 — foundation contracts.
   Plain Node, no framework, same shape as the r85/r90 suites: assertions
   over the real source plus behavioural checks against the domain module
   loaded exactly as the browser loads it (one IIFE that also exports for
   Node). Run: node tests/mahworld-phase0.test.js */
const fs = require('fs'), path = require('path'), assert = require('assert'), vm = require('vm');
const root = path.join(__dirname, '..');
function read(f) { return fs.readFileSync(path.join(root, f), 'utf8'); }
function code(f) { return read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"])\/\/[^\n]*/g, '$1'); }

const domainSrc = read('mahworld/mahworld-domain.js');
const shellSrc = read('mahworld/mahworld-shell.js');
const menuCss = read('mahworld/mahworld-menu.css');
const client = read('mygym.js');
const server = read('netlify/functions/mygym.js');
const sw = read('sw.js');

/* The domain, loaded fresh with a fake window + localStorage so flag and
   store behaviour can be exercised without a browser. */
function loadDomain(opts) {
  const storage = new Map();
  const win = { MAHWORLD_FLAGS: (opts && opts.flags) || undefined };
  const ctx = {
    window: win, globalThis: undefined, console,
    localStorage: { getItem: k => (storage.has(k) ? storage.get(k) : null), setItem: (k, v) => storage.set(k, String(v)), removeItem: k => storage.delete(k) }
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(domainSrc, ctx, { filename: 'mahworld-domain.js' });
  return { M: win.MAHWORLD, storage, win };
}

let passed = 0, failed = 0;
function P(name, ok, why) {
  if (ok) { passed++; return; }
  failed++; console.log('FAIL  ' + name + (why ? ' — ' + why : ''));
}

/* ---- 1. isolation and load safety --------------------------------------- */
P('MW-001 domain is one isolated module under mahworld/', fs.existsSync(path.join(root, 'mahworld/mahworld-domain.js')) && fs.existsSync(path.join(root, 'mahworld/mahworld-shell.js')) && fs.existsSync(path.join(root, 'mahworld/mahworld-menu.css')));
P('MW-002 domain imports nothing and never calls the network', !/\brequire\(|\bimport\b|\bfetch\(|XMLHttpRequest|WebSocket|navigator\.geolocation/.test(code('mahworld/mahworld-domain.js')));
P('MW-003 domain never touches the document on its own', !/document\.|querySelector|innerHTML|\.style\b/.test(code('mahworld/mahworld-domain.js')));
P('MW-004 no game engine or renderer dependency anywhere in mahworld/', !/\bthree\b|\bbabylon\b|\bunity\b|\bunreal\b|\bgodot\b|WebGL|mrmah3d|\.glsl|\bMesh\b|\bShader\b/i.test(code('mahworld/mahworld-domain.js') + code('mahworld/mahworld-shell.js')));
P('MW-005 the app shell loads MAHWORLD as deferred optional scripts BEFORE mygym.js', /mahworld\/mahworld-domain\.js\?v='\+V\+'"><\/script><script defer src="\/mahworld\/mahworld-shell\.js\?v='\+V\+'"><\/script><script defer src="\/mygym\.js/.test(server));
P('MW-006 the deploy context reaches the client as a flag, not as a secret', /window\.MAHWORLD_FLAGS=\{context:'\+JSON\.stringify\(String\(process\.env\.CONTEXT\|\|'production'\)\)/.test(server) && !/SERVICE_ROLE|SESSION_SECRET|OPENAI/.test(server.slice(server.indexOf('MAHWORLD_FLAGS'), server.indexOf('MAHWORLD_FLAGS') + 200)));
P('MW-007 cache identity advanced together (server V, sw V) and the new files are precached', /const V = 453;/.test(server) && /fob-shell-v453/.test(sw) && /'\/mahworld\/mahworld-domain\.js', '\/mahworld\/mahworld-shell\.js', '\/mahworld\/mahworld-menu\.css'/.test(sw));

/* ---- 2. every hook in mygym.js is guarded ------------------------------- */
const hooks = client.match(/mahworld[A-Za-z]*\(|window\.MAHWORLD[_A-Z]*/g) || [];
P('MW-010 mygym.js reaches MAHWORLD only through the guarded bridge helpers', hooks.length > 0 && /function mahworldReady\(\)\{return!!\(window\.MAHWORLD&&window\.MAHWORLD\.flags&&window\.MAHWORLD_SHELL\)\}/.test(client));
P('MW-011 the route exists only with the flag on and outside Coach client context, otherwise Home', /if\(view==='mahworld'\)\{if\(mahworldRouteAllowed\(\)\)\{mahworldPage\(\);return true\}home\(\);return true\}/.test(client) && /function mahworldRouteAllowed\(\)\{return mahworldReady\(\)&&window\.MAHWORLD\.flags\.isEnabled\(\)&&!isCoachClientContext\(\)\}/.test(client));
P('MW-012 the Home entry and the Settings section render nothing unless the route is allowed', /function mahworldHomeEntryHTML\(\)\{return mahworldRouteAllowed\(\)\?/.test(client) && /function mahworldSettingsHTML\(\)\{if\(!mahworldRouteAllowed\(\)\)return''/.test(client));
P('MW-013 the Home entry uses the canonical Home button geometry (.mg-button) in the existing directory stack', /class="mg-button mahworld-home" data-a="mahworld" data-mahworld-entry/.test(client) && /PROGRAM LIBRARY<\/button>'\+mahworldHomeEntryHTML\(\)\+'<\/div>'/.test(client));
P('MW-014 the accepted Home primary order and TODAY/crown are untouched by the bridge', !/mahworld/.test(client.slice(client.indexOf('function homePrimaryActionsHTML'), client.indexOf('function homePrimaryActionsHTML') + 600)) && !/HOME_PRIMARY_META[\s\S]{0,400}mahworld/.test(client));
P('MW-015 the account context handed to the domain is the SIGNED-IN ACCOUNT with the client-context flag', /getAccountContext:function\(\)\{var client=isCoachClientContext\(\);return\{accountId:S\.account&&S\.account\.id\|\|null,activeProfileId:S\.member&&S\.member\.id\|\|null,isClientContext:client,permissionKind:client\?'coach':'self'\}\}/.test(client));
P('MW-016 the theme adapter READS --bright-rgb and never writes a Theme', /getThemeAccent:function\(\)\{try\{return String\(getComputedStyle\(document\.documentElement\)\.getPropertyValue\('--bright-rgb'\)/.test(client) && !/applyTheme|saveTheme|writeLocalTheme/.test(client.slice(client.indexOf('function mahworldBind'), client.indexOf('function mahworldHomeEntryHTML'))));
P('MW-017 binding happens once at boot success, after the role context is known', /signedInAccountId:S\.account&&S\.account\.id\};\n\s*saveCoachProfileContext\(\);mahworldBind\(\);/.test(client));
P('MW-018 no fitness owner in mygym.js was given a MAHWORLD dependency', !/mahworld/i.test(client.slice(0, client.indexOf('function isCoachClientContext'))) && !/MAHWORLD/.test(client.slice(client.indexOf('function workout('), client.indexOf('function workout(') + 4000)));
P('MW-019 leaving the page goes through the app\'s page-teardown owner; sign-out and session loss re-bind the shell to the new owner; bind is wrapped', /if\(view!=='mahworld'\)mahworldLeave\(\)\}/.test(client) && /function mahworldLeave\(\)\{try\{if\(window\.MAHWORLD_SHELL&&typeof window\.MAHWORLD_SHELL\.unmount==='function'\)window\.MAHWORLD_SHELL\.unmount\(\)\}catch\(e\)\{\}\}/.test(client) && (client.match(/clearCoachProfileContext\(\);mahworldSyncOwner\(\);/g) || []).length === 2 && /function mahworldBind\(\)\{try\{/.test(client) && /catch\(e\)\{\}mahworldSyncOwner\(\)\}/.test(client) && /rerender:function\(\)\{if\(root\.querySelector\('\[data-mahworld-page\]'\)\)mahworldPage\(\)\}/.test(client));

/* ---- 3. flag default OFF, isolated, no auto presence ------------------- */
{
  const { M } = loadDomain();
  P('MW-020 development flag is OFF by default and reports its source', M.flags.isEnabled() === false && M.flags.source() === 'off');
  P('MW-021 the flag key lives in the fob.* family and is device-local', M.flags.key === 'fob.mahworld.dev.v1');
  const sess = M.createSession();
  P('MW-022 a fresh session is WORLD_OFF and cannot be entered from OFF', sess.state === 'WORLD_OFF' && sess.enter() === false && sess.state === 'WORLD_OFF');
  const prof = M.WorldProfile.create('acct-A');
  P('MW-023 a new WorldProfile is opted OUT of the world and OUT of presence', prof.mahworldEnabled === false && prof.presenceOptIn === false && prof.onboarding === 'not_started' && prof.avatarCreated === false);
  P('MW-024 with the flag off the world can never become available, even for an enabled profile', (prof.mahworldEnabled = true, sess.makeAvailable(prof) === false && sess.state === 'WORLD_OFF'));
}
{
  const { M } = loadDomain({ flags: { context: 'production', enabled: true, dev: true } });
  P('MW-025 the server-emitted flag object can never enable the flag: there is no page-wide switch', M.flags.isEnabled() === false && M.flags.source() === 'off' && !/MAHWORLD_FLAGS/.test(code('mahworld/mahworld-domain.js')));
}

/* ---- 4. the state machine ----------------------------------------------- */
{
  const { M } = loadDomain();
  M.bind({ flag: true });
  const s = M.createSession(); const p = M.WorldProfile.create('acct-A'); p.mahworldEnabled = true;
  const seen = []; s.subscribe(st => seen.push(st));
  P('MW-030 the five states exist under the reserved names', ['WORLD_OFF', 'WORLD_AVAILABLE', 'WORLD_ENTERING', 'WORLD_ACTIVE', 'WORLD_EXITING'].every(n => Object.values(M.STATES).indexOf(n) > -1));
  P('MW-031 OFF -> AVAILABLE -> ENTERING -> ACTIVE -> EXITING -> AVAILABLE round trip', s.makeAvailable(p) && s.enter() && s.entered() && s.exit() && s.exited() && s.state === 'WORLD_AVAILABLE' && seen.join('>') === 'WORLD_AVAILABLE>WORLD_ENTERING>WORLD_ACTIVE>WORLD_EXITING>WORLD_AVAILABLE');
  P('MW-032 illegal transitions are refused without changing state', s.entered() === false && s.exited() === false && s.state === 'WORLD_AVAILABLE');
  P('MW-033 the world cannot be switched off mid-session; it must exit first', s.enter() && s.entered() && s.makeUnavailable() === false && s.state === 'WORLD_ACTIVE');
  P('MW-034 entry can be cancelled back to available', (s.exit(), s.exited(), s.enter() && s.cancelEntry() && s.state === 'WORLD_AVAILABLE'));
  P('MW-035 presentation names map to the states and OFF removes the attribute', M.PRESENTATION.WORLD_OFF === null && M.PRESENTATION.WORLD_AVAILABLE === 'available' && M.PRESENTATION.WORLD_ACTIVE === 'active');
  const el = { attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; } };
  M.presentation.applyState(el, 'WORLD_ENTERING'); const a1 = el.attrs['data-mahworld-state'];
  M.presentation.applyState(el, 'WORLD_OFF'); const a2 = el.attrs['data-mahworld-state'];
  P('MW-036 applyState writes data-mahworld-state and clears it for OFF', a1 === 'entering' && a2 === undefined);
}

/* ---- 5. identity: signed-in account, never the active profile ---------- */
{
  const { M } = loadDomain();
  const self = M.identity.resolveOwner({ accountId: 'jah', activeProfileId: 'jah', isClientContext: false, permissionKind: 'self' });
  const coachViewing = M.identity.resolveOwner({ accountId: 'jah', activeProfileId: 'dominic', isClientContext: true, permissionKind: 'coach' });
  const mismatch = M.identity.resolveOwner({ accountId: 'jah', activeProfileId: 'dominic', isClientContext: false });
  const none = M.identity.resolveOwner({});
  P('MW-040 self context owns its own WorldProfile', self.ok && self.ownerAccountId === 'jah');
  P('MW-041 a coach viewing a client has NO world owner (neither coach nor client)', !coachViewing.ok && coachViewing.reason === 'CLIENT_CONTEXT_BLOCKED' && coachViewing.ownerAccountId === null);
  P('MW-042 an active profile that is not the account never becomes the owner', !mismatch.ok && !none.ok);
  P('MW-043 the local draft store is namespaced by owner account', M.store.keyFor('jah') !== M.store.keyFor('dominic') && M.store.keyFor('jah').indexOf('fob.mahworld.profile.v0.') === 0);
  const p = M.WorldProfile.create('jah'); p.mahworldEnabled = true;
  P('MW-044 a draft round-trips through the store and an invalid draft is refused', M.store.save(p) === true && M.store.load('jah').ownerAccountId === 'jah' && M.store.load('dominic') === null && M.store.save({ contract: 'mahworld.WorldProfile', ownerAccountId: 'x' }) === false);
}

/* ---- 6. MAHGIC is canonical --------------------------------------------- */
{
  const { M } = loadDomain();
  const all = (domainSrc + shellSrc + menuCss + read('MAHWORLD_PHASE0_FOUNDATION.md')).toLowerCase();
  P('MW-050 the resource is named MAHGIC', M.RESOURCE_NAME === 'MAHGIC' && M.Mahgic.resource === 'MAHGIC' && M.WorldProfile.create('a').mahgic.resource === 'MAHGIC');
  P('MW-051 no forbidden spelling appears in mahworld/ or the foundation doc (outside the prohibition notes)', !/mahnah|mahna\b/.test(all.replace(/do not (use|introduce)[^.\n]*mahnah[^.\n]*/g, '').replace(/mahnah \/ mahna \/ mana/g, '').replace(/not mahnah, mahna, or mana/g, '')) && !/\bmana\b/.test(all.replace(/do not (use|introduce)[^.\n]*/g, '').replace(/mahnah \/ mahna \/ mana/g, '').replace(/not mahnah, mahna, or mana/g, '').replace(/\/ mana\)/g, '')));
  const m = M.Mahgic.create({ capacity: 10, current: 4, recoveryPerMinute: 1 });
  P('MW-052 MAHGIC spend refuses overdraft and recovery is capped at capacity', M.Mahgic.spend(m, 5).ok === false && M.Mahgic.spend(m, 4).mahgic.current === 0 && M.Mahgic.recover(m, 60).current === 10);
}

/* ---- 7. progression: level 1..100, replaceable curve ------------------- */
{
  const { M } = loadDomain();
  P('MW-060 level 1 to 100 is representable and the curve is monotonic', M.Progression.MAX_LEVEL === 100 && M.Progression.levelForXp(0) === 1 && M.Progression.levelForXp(1e12) === 100 && M.Progression.xpForLevel(100) > M.Progression.xpForLevel(50) && M.Progression.xpForLevel(50) > M.Progression.xpForLevel(2));
  const before = M.Progression.xpForLevel(10);
  M.setBalance(Object.assign({}, JSON.parse(JSON.stringify(M.BALANCE_V0)), { version: 'test-curve', curve: { kind: 'table', values: Array.from({ length: 100 }, (_, i) => i * 10), maxLevel: 100 } }));
  P('MW-061 the balance table is versioned and swapping it changes the curve without touching the domain', M.getBalance().version === 'test-curve' && M.Progression.xpForLevel(10) === 90 && M.Progression.xpForLevel(10) !== before);
  let threw = false; try { M.setBalance({ curve: {} }); } catch (e) { threw = true; }
  P('MW-062 a balance table without a version is refused', threw);
  const prog = M.Progression.fromLifetimeXp(95);
  P('MW-063 progression carries level, lifetime XP, XP into level and progress to next', prog.level === 10 && prog.xpIntoLevel === 5 && prog.xpForNextLevel === 100 && prog.progressToNext > 0.4 && prog.progressToNext < 0.6);
}

/* ---- 8. the adapter boundary: real fitness in, derived game out --------- */
{
  const { M } = loadDomain();
  const workout = { id: 'w', completedAt: '2026-09-05T10:00:00Z', exercises: [
    { name: 'squat', region: 'lower', sets: [{ reps: 5, weight: 140, completed: true }, { reps: 12, weight: 60, completed: true }, { reps: 20, weight: 20, completed: true }, { reps: 5, weight: 140, completed: false }] },
    { name: 'bench', region: 'upper', sets: [{ reps: 3, weight: 100, completed: true }] } ] };
  const sig = M.signals.normalizeWorkout(workout);
  P('MW-070 only COMPLETED sets become signals (LIVE-004 truth), classified heavy / hypertrophy / endurance', sig.length === 4 && sig.map(s => s.kind).sort().join() === 'endurance,hypertrophy,strength,strength');
  P('MW-071 signals never carry the fitness record itself, only a source reference', sig.every(s => !s.record && s.source && s.source.type === 'workout' && s.source.id === 'w'));
  const frozen = JSON.stringify(workout);
  const d = M.derive(sig.concat(M.signals.normalizeActivity({ id: 'a', type: 'run', distanceMeters: 4000, durationSeconds: 1500, completedAt: '2026-09-05T11:00:00Z' }), M.signals.normalizeBody({ recordedAt: '2026-09-05', weightKg: 80 })));
  P('MW-072 derivation is pure: inputs untouched, output versioned, XP an integer', JSON.stringify(workout) === frozen && d.version === M.getBalance().version && Number.isInteger(d.xp) && d.xp > 0);
  P('MW-073 lower-body training develops the lower-body musculature more than the upper', d.musculatureDeltas.lowerBody > d.musculatureDeltas.chest && d.attributeDeltas.strength > 0 && d.attributeDeltas.endurance > 0);
  const many = []; for (let i = 0; i < 80; i++) many.push({ kind: 'strength', units: 1, region: 'upper', at: '2026-09-05T10:00:00Z' });
  const capped = M.derive(many), half = M.derive(many.slice(0, 40));
  P('MW-074 diminishing returns apply per day', capped.xp < half.xp * 2 && capped.xp > half.xp);
  const p = M.WorldProfile.create('acct');
  let bare = false; try { M.antiExploit.applyDerivation(p, { xp: 500 }); } catch (e) { bare = true; }
  const preview = M.antiExploit.applyDerivation(p, d);
  const serverSide = M.antiExploit.applyDerivation(p, d, { authority: 'server-validated' });
  P('MW-075 a bare "give me XP" is refused; a derivation applies as a PREVIEW unless the server validated it', bare && preview.authority === 'local-draft' && preview.lastDerivation.authority === 'client-preview' && serverSide.authority === 'server' && preview.progression.lifetimeXp === d.xp);
  P('MW-076 the fitness record shapes accepted by the adapter are MAHFITT\'s, not a world schema', /completedAt \|\| w\.date \|\| w\.endedAt/.test(domainSrc) && /distanceMeters/.test(domainSrc) && /durationSeconds/.test(domainSrc) && /weightKg/.test(domainSrc));
}

/* ---- 9. presence privacy ------------------------------------------------ */
{
  const { M } = loadDomain();
  const p = M.WorldProfile.create('acct'); p.presenceOptIn = true; p.displayRef = 'MAH-7';
  const pres = M.Presence.create({ optIn: true, level: 'venue', venueRef: 'gym-7', regionRef: 'west', latitude: 51.5, longitude: -0.1, coords: { lat: 1, lng: 2 }, nested: { geo: { accuracy: 3 } } });
  const pub = M.Presence.toPublicPayload(p, pres);
  P('MW-080 a public presence payload never contains precise location keys, however nested', pub && !M.Presence.containsPreciseLocation(pub) && JSON.stringify(pub).indexOf('51.5') < 0 && pub.venueRef === 'gym-7');
  P('MW-081 presence is off by default and off means NO payload at all', M.Presence.create().optIn === false && M.Presence.toPublicPayload(M.WorldProfile.create('b'), M.Presence.create({ optIn: true, level: 'venue' })) === null && M.Presence.toPublicPayload(p, M.Presence.create({ optIn: false, level: 'venue' })) === null);
  P('MW-082 the abstraction levels are the reserved ones and hidden publishes nothing', M.Presence.levels.join() === 'hidden,region,venue,instance,room' && M.Presence.toPublicPayload(p, M.Presence.create({ optIn: true, level: 'hidden' })) === null);
  P('MW-083 nothing in mahworld/ reads device geolocation (the word appears only in the forbidden-key list)', !/navigator\.geolocation|getCurrentPosition|watchPosition/.test(domainSrc + shellSrc) && /FORBIDDEN_PRESENCE_KEYS[^\n]*'geolocation'/.test(domainSrc));
  const shaped = M.Presence.toPublicPayload(p, M.Presence.create({ optIn: true, level: 'venue', venueRef: { geohash: 'u4pruydqqvj' }, regionRef: '51.5074,-0.1278' }));
  const geoName = M.Presence.toPublicPayload(Object.assign({}, p, { displayRef: 'geo:51.5074,-0.1278' }), M.Presence.create({ optIn: true, level: 'region', regionRef: 'west' }));
  P('MW-084 public references are opaque strings only: objects, coordinate-looking strings, geo: URIs and over-long values are dropped', shaped && shaped.venueRef === null && shaped.regionRef === null && geoName && geoName.displayRef === null && geoName.regionRef === 'west' && M.Presence.opaqueRef('x'.repeat(65)) === null && M.Presence.opaqueRef(['gym-7']) === null && M.Presence.opaqueRef(' gym-7 ') === 'gym-7');
  P('MW-085 the location detector also catches location-shaped names and coordinate strings at any depth', M.Presence.containsPreciseLocation({ roomRef: { location: { x: 1, y: 2 } } }) && M.Presence.containsPreciseLocation({ note: '51.5074, -0.1278' }) && M.Presence.containsPreciseLocation({ a: { b: { latLng: [1, 2] } } }) && !M.Presence.containsPreciseLocation({ venueRef: 'gym-7', level: 'venue' }) && M.Presence.toPublicPayload(p, M.Presence.create({ optIn: true, level: 'orbit', venueRef: 'gym-7' })) === null);
}

/* ---- 10. avatar is data, not a renderer --------------------------------- */
{
  const { M } = loadDomain();
  const a = M.Avatar.create('feminine');
  P('MW-090 avatar has the two bases and renderer-independent fields', M.Avatar.bases.join() === 'masculine,feminine' && a.base === 'feminine' && 'musculature' in a && 'proportion' in a && 'cosmetics' in a && 'traversalCapabilities' in a && 'abilityVisualState' in a);
  const grown = M.Avatar.applyMusculature(a, { chest: 0.4, lowerBody: 2 });
  P('MW-091 musculature is a bounded derived state, applied through the adapter', grown.musculature.chest === 0.4 && grown.musculature.lowerBody === 1 && a.musculature.chest === 0);
  P('MW-092 avatar data names no Three.js / mrmah3d / mesh concept', !/three|mrmah3d|mesh|shader|geometry|material/i.test(JSON.stringify(a)));
}

/* ---- 11. abilities, traversal, inventory, reserved systems ------------- */
{
  const { M } = loadDomain();
  const ab = M.Ability.create({ id: 'levitate-1', name: 'Levitate', sourceCategory: 'core', mahgicCost: 3, unlock: { level: 5, attributes: { control: 2 } }, traversalComponent: 'levitate' });
  const p = M.WorldProfile.create('acct');
  P('MW-100 the Ability contract carries every reserved field and gates on level and attributes', M.Ability.fields.length >= 15 && ab.mahgicCost === 3 && M.Ability.isUnlocked(ab, p) === false);
  p.progression = M.Progression.fromLifetimeXp(M.Progression.xpForLevel(6)); p.attributes.control = 5;
  P('MW-101 an ability unlocks when the profile meets its requirements', M.Ability.isUnlocked(ab, p) === true);
  P('MW-102 traversal tiers are reserved up to aerial control, starting at walk, with no hard-coded unlock levels', M.Traversal.tiers.join() === 'walk,sprint,jump,enhanced-jump,climb,levitate,sustained-levitate,fly,aerial-control' && M.Traversal.create().tier === 'walk' && !/unlockLevel|LEVEL_FOR_FLIGHT/.test(domainSrc));
  const inv = M.Inventory.add(M.Inventory.create('acct'), { id: 'cape', kind: 'cosmetic' });
  P('MW-103 inventory accepts only the reserved kinds and carries no economy', inv.items.length === 1 && M.Inventory.add(inv, { id: 'coin', kind: 'currency' }).items.length === 1 && !/blockchain|\bnft\b|wallet|\btrade/i.test(code('mahworld/mahworld-domain.js')));
  P('MW-104 MAHMATCH, RACING, TRAINING_ROOM and FOBBING are reserved namespaces without mechanics', ['MAHMATCH', 'RACING', 'TRAINING_ROOM', 'FOBBING'].every(k => M.reserved[k] && M.reserved[k].status === 'reserved') && !/damage\s*[:=]\s*\d|hitpoints|round\s*\d/i.test(domainSrc.slice(domainSrc.indexOf('var reserved'))));
}

/* ---- 12. MAHTROPOLIS portals open canonical MAHFITT owners only --------- */
{
  const { M } = loadDomain();
  const opened = [];
  M.bind({ navigate: v => opened.push(v) });
  P('MW-110 every destination names its MAHFITT owner or is marked future', M.MAHTROPOLIS.length >= 10 && M.MAHTROPOLIS.every(d => d.mahfittOwner || d.status === 'future'));
  P('MW-111 a portal navigates to the existing MAHFITT view and a future destination opens nothing', M.openDestination('calendar') === true && opened.join() === 'calendar' && M.openDestination('shop') === false && opened.length === 1);
  const routes = M.MAHTROPOLIS.map(d => d.mahfittRoute).filter(Boolean);
  P('MW-112 every portal route is a view mygym.js actually renders', routes.length >= 6 && routes.every(r => new RegExp("view==='" + r + "'").test(client)));
  const acted = [];
  M.bind({ openAction: k => { acted.push(k); return true; } });
  P('MW-114 MAH PLAYER is an app-owned overlay, opened through the app\'s own music-studio action, never a route', M.MAHTROPOLIS.filter(d => d.id === 'player')[0].mahfittRoute === null && M.openDestination('player') === true && acted.join() === 'music-studio' && opened.length === 1 && /openAction:function\(kind\)\{if\(kind==='music-studio'\)\{openMusicStudio\(\);return true\}return false\}/.test(client) && /if\(a==='music-studio'\)\{openMusicStudio\(\);return\}/.test(client));
  P('MW-113 music is documented as MAH Player owned by the signed-in account, no second queue', M.music.owner === 'MAH PLAYER' && M.music.secondQueue === false && !/new Audio\(|AudioContext|playlist/.test(domainSrc + shellSrc));
}

/* ---- 13. the shell: reuses MAHFITT primitives, honours reduced motion --- */
P('MW-120 the shell renders with MAHFITT settings primitives and canonical buttons only', /class="home mahset-view mahworld-view"/.test(shellSrc) && /mahset-group|mahset-action|mahset-row/.test(shellSrc) && !/<style|style="/.test(shellSrc));
P('MW-121 the shell\'s controls dispatch through their own attribute, not the app\'s data-a router', /data-mahworld-action/.test(shellSrc) && !/data-a=/.test(shellSrc));
P('MW-122 the URL development switch is refused on the production deploy context off a local host', /allowed = localHost\(\) \|\| deployContext\(\) !== 'production'/.test(shellSrc));
P('MW-123 the world session the shell enters is labelled a simulation', /SIMULATED/.test(shellSrc));
P('MW-124 the menu hook is CSS-only, scoped to the state attribute, and paused under prefers-reduced-motion', /html\[data-mahworld-state="available"\]/.test(menuCss) && /@media \(prefers-reduced-motion:reduce\)[\s\S]*animation:none!important/.test(menuCss) && !/requestAnimationFrame|setInterval/.test(shellSrc.slice(0, shellSrc.indexOf('function later'))));
P('MW-125 the hook changes no button geometry (no size, radius, padding or min-height on the entry)', !/(min-height|padding|border-radius|width|height)\s*:/.test(menuCss.split('/* ---- the development entry control')[1].split('/* ---- the internal shell page')[0]));
P('MW-126 the energy colour derives from the Theme Secondary custom property', /--mahworld-energy-rgb:var\(--bright-rgb/.test(menuCss));

/* ---- 14. the foundation document classifies decisions ------------------ */
{
  const doc = read('MAHWORLD_PHASE0_FOUNDATION.md');
  P('MW-130 the foundation document exists and tags LOCKED / PROVISIONAL / FUTURE', /LOCKED/.test(doc) && /PROVISIONAL/.test(doc) && /FUTURE/.test(doc));
  ['control deck', 'opt-in', 'WORLD_AVAILABLE', 'WorldProfile', 'Avatar', 'FitnessAttributes', 'MAHGIC', 'Ability', 'MAHTROPOLIS', 'Presence', 'Inventory', 'engine', 'anti-exploit'].forEach(k => {
    P('MW-131 foundation covers ' + k, new RegExp(k.replace(/[-]/g, '[- ]'), 'i').test(doc));
  });
}

console.log('mahworld-phase0: ' + passed + '/' + (passed + failed) + ' PASS');
if (failed) process.exit(1);
