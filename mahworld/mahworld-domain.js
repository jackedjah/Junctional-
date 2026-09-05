/* MAHWORLD :: DOMAIN  (Phase 0 — foundation)
   The one isolated MAHWORLD namespace. Contracts, the menu/world session
   state machine, the fitness -> signal -> progression adapter boundary, the
   provisional balancing table, the identity rule, presence privacy and the
   MAHTROPOLIS destination map.

   PRODUCT LAW (MAHFITT_MAHWORLD_MENU_BRIDGE_ADDENDUM §1, LOCKED):
     MAHFITT is the player's permanent fitness operating system / control
     deck. MAHWORLD is the optional playable world behind it. MAHFITT owns
     every piece of real fitness truth; MAHWORLD owns only derived game state
     and consumes fitness through the adapter in this file. Nothing here may
     become a required dependency of ordinary MAHFITT startup.

   HOW THIS FILE RELATES TO THE APP:
     - It is a plain script (ES5, one IIFE) that attaches `window.MAHWORLD`,
       exactly as mygym.js's helper modules attach `window.MAHFITT_*`. It
       also exports through `module.exports` so the Node contract suite can
       require it directly. It imports nothing and reads no MAHFITT state on
       its own: the app shell hands it adapters through `MAHWORLD.bind()`.
     - It touches no DOM except through `presentation.applyState(root)`, and
       only when the shell calls it. The state machine itself is DOM-free.
     - It never calls the network. Persistence in Phase 0 is a LOCAL DRAFT
       under an account-namespaced key (see `store`), explicitly provisional;
       the server-owned WorldProfile table is reserved, not created (see
       MAHWORLD_PHASE0_FOUNDATION.md).
     - The canonical energy resource is MAHGIC. No other spelling exists in
       this namespace, and the contract suite scans for the wrong ones.

   Every decision below is tagged LOCKED / PROVISIONAL / FUTURE in the
   foundation document; the code carries the same tags in short form. */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  if (root && typeof root === 'object') root.MAHWORLD = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function () {
  'use strict';

  var VERSION = 'phase0';
  /* LOCKED (bridge §8). */
  var RESOURCE_NAME = 'MAHGIC';

  /* ------------------------------------------------------------------ */
  /* Small helpers — no dependencies.                                    */
  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function num(v, fallback) { var n = Number(v); return isFinite(n) ? n : (fallback == null ? 0 : fallback); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function nowIso() { try { return new Date().toISOString(); } catch (e) { return ''; } }
  function assign(target) {
    for (var i = 1; i < arguments.length; i++) {
      var src = arguments[i];
      if (!src) continue;
      for (var k in src) if (Object.prototype.hasOwnProperty.call(src, k)) target[k] = src[k];
    }
    return target;
  }
  function deepFreeze(o) {
    if (!o || typeof o !== 'object' || Object.isFrozen(o)) return o;
    Object.freeze(o);
    Object.keys(o).forEach(function (k) { deepFreeze(o[k]); });
    return o;
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* ------------------------------------------------------------------ */
  /* FEATURE FLAG — default OFF. LOCKED (brief §7, §49).                 */
  /* Ordinary members never see MAHWORLD in Phase 0. The flag is a       */
  /* development capability with exactly two sources, both default off:  */
  /* the bind({flag}) override (tests, tooling) and the device-local     */
  /* localStorage key. The server-emitted window.MAHWORLD_FLAGS carries  */
  /* only the deploy context and can never enable the flag — a page-wide */
  /* switch would be a third door and the brief allows none. The app     */
  /* shell must load this file so that its absence changes nothing.      */
  var FLAG_KEY = 'fob.mahworld.dev.v1';   /* localStorage, same family as fob.mahfitt.* */
  var flagOverride = null;                /* for tests and the shell: bind({ flag: true|false }) */
  function readStorage(key) {
    try { if (typeof localStorage !== 'undefined') return localStorage.getItem(key); } catch (e) {}
    return null;
  }
  function writeStorage(key, value) {
    try {
      if (typeof localStorage === 'undefined') return false;
      if (value == null) localStorage.removeItem(key); else localStorage.setItem(key, String(value));
      return true;
    } catch (e) { return false; }
  }
  var flags = {
    key: FLAG_KEY,
    /* Is the development MAHWORLD capability enabled for this device? */
    isEnabled: function () {
      if (flagOverride === true || flagOverride === false) return flagOverride;
      return readStorage(FLAG_KEY) === '1';
    },
    /* Explicit developer opt-in on this device. Never called by the product. */
    enableDev: function () { return writeStorage(FLAG_KEY, '1'); },
    disableDev: function () { return writeStorage(FLAG_KEY, null); },
    source: function () {
      if (flagOverride === true || flagOverride === false) return 'bound';
      return readStorage(FLAG_KEY) === '1' ? 'storage' : 'off';
    }
  };

  /* ------------------------------------------------------------------ */
  /* MENU / WORLD SESSION STATE MACHINE. PROVISIONAL names (bridge §6),  */
  /* LOCKED shape: MAHFITT must always know whether the world is         */
  /* unavailable, available-but-inactive, being entered, active, or      */
  /* being left. Not coupled to any engine: `enter` and `exit` only move */
  /* the machine; whatever runs the world subscribes.                    */
  var STATES = deepFreeze({
    OFF: 'WORLD_OFF',
    AVAILABLE: 'WORLD_AVAILABLE',
    ENTERING: 'WORLD_ENTERING',
    ACTIVE: 'WORLD_ACTIVE',
    EXITING: 'WORLD_EXITING'
  });
  var TRANSITIONS = deepFreeze({
    WORLD_OFF: ['WORLD_AVAILABLE'],
    WORLD_AVAILABLE: ['WORLD_OFF', 'WORLD_ENTERING'],
    WORLD_ENTERING: ['WORLD_ACTIVE', 'WORLD_AVAILABLE'],   /* cancel / failure returns to available */
    WORLD_ACTIVE: ['WORLD_EXITING'],
    WORLD_EXITING: ['WORLD_AVAILABLE']
  });
  /* Presentation state names for the menu layer (bridge §5, brief §11):  */
  /* what [data-mahworld-state] carries. `off` is the absence of the      */
  /* attribute so the accepted CSS is untouched when the flag is off.     */
  var PRESENTATION = deepFreeze({
    WORLD_OFF: null,
    WORLD_AVAILABLE: 'available',
    WORLD_ENTERING: 'entering',
    WORLD_ACTIVE: 'active',
    WORLD_EXITING: 'exiting'
  });

  function createSession(options) {
    var opts = options || {};
    var state = STATES.OFF;
    var listeners = [];
    var history = [];
    var reasonLast = 'init';
    function emit(prev, next, reason) {
      var ev = { from: prev, to: next, reason: reason || '', at: nowIso() };
      history.push(ev);
      if (history.length > 40) history.shift();
      var ls = listeners.slice();   /* snapshot: a listener may unsubscribe itself mid-notification */
      for (var i = 0; i < ls.length; i++) {
        try { ls[i](next, ev); } catch (e) { if (opts.onError) opts.onError(e); }
      }
    }
    var session = {
      get state() { return state; },
      can: function (to) { return (TRANSITIONS[state] || []).indexOf(to) > -1; },
      /* Guarded transition. Returns false (and does nothing) when illegal —
         an illegal transition is a programming error in the caller, never
         something the member should see as a broken state. */
      transition: function (to, reason) {
        if (!session.can(to)) return false;
        var prev = state; state = to; reasonLast = reason || '';
        emit(prev, to, reason);
        return true;
      },
      /* The world becomes AVAILABLE only when the flag is on AND the
         WorldProfile has MAHWORLD enabled. Both are explicit opt-ins. */
      makeAvailable: function (profile, reason) {
        if (!flags.isEnabled()) return false;
        if (!profile || profile.mahworldEnabled !== true) return false;
        return state === STATES.OFF ? session.transition(STATES.AVAILABLE, reason || 'profile-enabled') : state === STATES.AVAILABLE;
      },
      makeUnavailable: function (reason) {
        if (state === STATES.OFF) return true;
        if (state === STATES.AVAILABLE) return session.transition(STATES.OFF, reason || 'disabled');
        return false;   /* cannot switch the world off mid-session; exit first */
      },
      /* Explicit user action only (brief §7). */
      enter: function (reason) { return session.transition(STATES.ENTERING, reason || 'user-enter'); },
      entered: function (reason) { return session.transition(STATES.ACTIVE, reason || 'world-ready'); },
      cancelEntry: function (reason) { return state === STATES.ENTERING && session.transition(STATES.AVAILABLE, reason || 'entry-cancelled'); },
      exit: function (reason) { return session.transition(STATES.EXITING, reason || 'user-exit'); },
      exited: function (reason) { return session.transition(STATES.AVAILABLE, reason || 'returned-to-mahfitt'); },
      subscribe: function (fn) {
        if (typeof fn !== 'function') return function () {};
        listeners.push(fn);
        return function () { var i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
      },
      presentationState: function () { return PRESENTATION[state]; },
      snapshot: function () { return { state: state, reason: reasonLast, history: history.slice(-8) }; }
    };
    return session;
  }

  /* The presentation hook: one attribute on the root the shell names
     (the app's shell decides which element; the domain never picks one).
     Removing the attribute is what "off" means, so with the flag off the
     accepted stylesheets see nothing new. */
  var presentation = {
    attribute: 'data-mahworld-state',
    applyState: function (el, state) {
      if (!el || !el.setAttribute) return false;
      var name = PRESENTATION[state];
      if (name == null) { if (el.removeAttribute) el.removeAttribute(presentation.attribute); }
      else el.setAttribute(presentation.attribute, name);
      return true;
    }
  };

  /* ------------------------------------------------------------------ */
  /* IDENTITY RULE. LOCKED (brief §36, R90 role map).                    */
  /* A WorldProfile belongs to the SIGNED-IN ACCOUNT, never to the       */
  /* active fitness profile. In Coach client context (a coach viewing a  */
  /* client) there is NO MAHWORLD owner at all: the coach's world state  */
  /* must not be attributed to the client and the client's must not be   */
  /* opened by the coach. The context object mirrors what R90 exposes:   */
  /*   { accountId, activeProfileId, isClientContext, permissionKind }    */
  /* and is supplied by the shell adapter, never invented here.          */
  var identity = {
    resolveOwner: function (ctx) {
      var c = isObj(ctx) ? ctx : {};
      var accountId = c.accountId == null ? '' : String(c.accountId);
      if (!accountId) return { ok: false, ownerAccountId: null, reason: 'NO_ACCOUNT' };
      if (c.isClientContext === true) return { ok: false, ownerAccountId: null, reason: 'CLIENT_CONTEXT_BLOCKED' };
      if (c.activeProfileId != null && String(c.activeProfileId) !== accountId) return { ok: false, ownerAccountId: null, reason: 'ACTIVE_PROFILE_IS_NOT_ACCOUNT' };
      if (c.permissionKind && c.permissionKind !== 'self') return { ok: false, ownerAccountId: null, reason: 'NOT_SELF' };
      return { ok: true, ownerAccountId: accountId, reason: 'SELF' };
    }
  };

  /* ------------------------------------------------------------------ */
  /* CONTRACTS. Extensible records with a `contract` tag and version.    */

  /* WorldProfile — PROVISIONAL fields, LOCKED existence (brief §19). */
  var ONBOARDING = deepFreeze({ NOT_STARTED: 'not_started', IN_PROGRESS: 'in_progress', COMPLETE: 'complete' });
  var WorldProfile = {
    contract: 'mahworld.WorldProfile',
    version: 1,
    create: function (ownerAccountId, extra) {
      if (!ownerAccountId) throw new Error('WorldProfile requires the signed-in account id');
      return assign({
        contract: WorldProfile.contract, version: WorldProfile.version,
        ownerAccountId: String(ownerAccountId),
        mahworldEnabled: false,          /* explicit opt-in (brief §7) */
        onboarding: ONBOARDING.NOT_STARTED,
        avatarCreated: false,
        avatar: null,                    /* an Avatar record once created (never a renderer object) */
        displayRef: null,                /* public handle; never a real name by default */
        presenceOptIn: false,            /* separate opt-in (brief §7, §35) */
        presenceLevel: 'hidden',         /* the member's chosen abstraction level */
        progression: Progression.create(),
        attributes: FitnessAttributes.create(),
        mahgic: Mahgic.create(),
        traversal: Traversal.create(),
        abilities: { unlocked: [], equipped: [] },
        inventoryRef: null,              /* Inventory lives in its own boundary */
        currentWorldRef: null,           /* { worldId, sessionId } while ACTIVE */
        lastDerivation: null,            /* summary of the last adapter result and its authority */
        authority: 'local-draft',        /* 'local-draft' | 'server' — see antiExploit */
        createdAt: nowIso(), updatedAt: nowIso()
      }, extra || {});
    },
    validate: function (p) {
      var errs = [];
      if (!isObj(p)) return ['not an object'];
      if (p.contract !== WorldProfile.contract) errs.push('contract');
      if (!p.ownerAccountId) errs.push('ownerAccountId');
      if (typeof p.mahworldEnabled !== 'boolean') errs.push('mahworldEnabled');
      if (typeof p.presenceOptIn !== 'boolean') errs.push('presenceOptIn');
      if (!isObj(p.progression) || !(p.progression.level >= 1 && p.progression.level <= 100)) errs.push('progression.level');
      if (!isObj(p.mahgic) || p.mahgic.resource !== RESOURCE_NAME) errs.push('mahgic');
      else if (!isFinite(Number(p.mahgic.capacity)) || !isFinite(Number(p.mahgic.current)) || !isFinite(Number(p.mahgic.recoveryPerMinute))) errs.push('mahgic.numbers');
      return errs;
    }
  };

  /* Avatar — renderer-independent (brief §20). Nothing here names a mesh,
     a shader, a Three.js type or a file in mrmah3d/. The Godform renderer
     is a PRESENTATION of this data; Astra's character work is not touched. */
  var AVATAR_BASES = deepFreeze(['masculine', 'feminine']);
  var Avatar = {
    contract: 'mahworld.Avatar',
    version: 1,
    bases: AVATAR_BASES,
    create: function (base, extra) {
      var b = AVATAR_BASES.indexOf(base) > -1 ? base : 'masculine';
      return assign({
        contract: Avatar.contract, version: Avatar.version,
        base: b,
        appearance: { theme: 'inherit', accentRole: 'secondary' },   /* derives from the account Theme, never owns it */
        /* Visual musculature state — normalised 0..1 per region, DERIVED
           later from real training (brief §21); Phase 0 only carries it. */
        musculature: { shoulders: 0, chest: 0, back: 0, arms: 0, core: 0, lowerBody: 0 },
        proportion: { stage: 0 },                    /* 0..N progression stage of the godform */
        cosmetics: { equipped: [] },
        attachments: [],
        traversalCapabilities: [],                    /* mirrors Traversal unlocks for the renderer */
        abilityVisualState: { active: [], charged: false },
        updatedAt: nowIso()
      }, extra || {});
    },
    /* Real-world training -> avatar musculature is a DERIVATION, applied
       through the adapter, never edited by hand in the product. */
    applyMusculature: function (avatar, deltas) {
      var a = clone(avatar); var d = isObj(deltas) ? deltas : {};
      Object.keys(a.musculature).forEach(function (k) {
        a.musculature[k] = clamp(num(a.musculature[k]) + num(d[k]), 0, 1);
      });
      a.updatedAt = nowIso();
      return a;
    }
  };

  /* FitnessAttributes — dimensions PROVISIONAL, balancing not locked (§22). */
  var ATTRIBUTE_KEYS = deepFreeze(['strength', 'hypertrophy', 'power', 'endurance', 'control', 'defense', 'quickness', 'mahgicCapacity', 'mahgicRecovery']);
  var FitnessAttributes = {
    contract: 'mahworld.FitnessAttributes',
    version: 1,
    keys: ATTRIBUTE_KEYS,
    create: function (extra) {
      var a = { contract: FitnessAttributes.contract, version: FitnessAttributes.version };
      ATTRIBUTE_KEYS.forEach(function (k) { a[k] = 0; });
      return assign(a, extra || {});
    },
    add: function (attrs, deltas, caps) {
      var out = clone(attrs); var d = isObj(deltas) ? deltas : {}; var c = isObj(caps) ? caps : {};
      ATTRIBUTE_KEYS.forEach(function (k) {
        var cap = c[k] == null ? Infinity : num(c[k]);
        out[k] = clamp(num(out[k]) + num(d[k]), 0, cap);
      });
      return out;
    }
  };

  /* MAHGIC — architecture only (§23, §24). Capacity / recovery FORMULAS
     are not final and live in the balancing table. */
  var Mahgic = {
    contract: 'mahworld.MAHGIC',
    version: 1,
    resource: RESOURCE_NAME,
    create: function (extra) {
      return assign({
        contract: Mahgic.contract, version: Mahgic.version, resource: RESOURCE_NAME,
        capacity: 0, current: 0, recoveryPerMinute: 0, lastRecoveryAt: nowIso()
      }, extra || {});
    },
    /* The future uses MAHGIC may power (§24), as a documented list — no costs. */
    futureUses: deepFreeze(['enhanced-traversal', 'levitation', 'sustained-levitation', 'flight', 'projectile', 'construct', 'defensive-effect', 'special-attack']),
    spend: function (m, amount) {
      var out = clone(m); var a = Math.max(0, num(amount)); var cur = num(out.current);
      if (!(cur >= a)) return { ok: false, mahgic: out, reason: 'INSUFFICIENT_MAHGIC' };
      out.current = cur - a; return { ok: true, mahgic: out };
    },
    recover: function (m, minutes) {
      var out = clone(m);
      out.current = clamp(num(out.current) + num(out.recoveryPerMinute) * Math.max(0, num(minutes)), 0, num(out.capacity));
      out.lastRecoveryAt = nowIso();
      return out;
    }
  };

  /* ------------------------------------------------------------------ */
  /* BALANCING TABLE — versioned, replaceable (§26). v0 is PROVISIONAL   */
  /* and deliberately simple; nothing in the product depends on its      */
  /* numbers. `setBalance` refuses a table without a version.            */
  var BALANCE_V0 = deepFreeze({
    version: 'v0-provisional',
    /* Level 1..100 — the curve is a function of level, replaceable. */
    curve: { kind: 'quadratic', base: 100, growth: 1.35, maxLevel: 100 },
    /* Set classification thresholds (§25 — provisional, not science). */
    classify: { heavyMaxReps: 5, hypertrophyMaxReps: 15 },
    /* XP per normalised signal unit. */
    xp: { strength: 12, hypertrophy: 10, power: 12, endurance: 8, control: 8, activity: 6, body: 4 },
    /* Attribute points per signal unit, by signal kind. */
    attributes: {
      strength:    { strength: 1.0, defense: 0.5 },
      hypertrophy: { hypertrophy: 1.0, strength: 0.25 },
      power:       { power: 1.0, quickness: 0.5 },
      endurance:   { endurance: 1.0, mahgicCapacity: 0.5, mahgicRecovery: 0.25 },
      control:     { control: 1.0 },
      activity:    { endurance: 0.5, mahgicRecovery: 0.25 },
      body:        { }
    },
    /* Musculature region per signal kind + body region (Avatar.musculature). */
    musculature: { upper: ['shoulders', 'chest', 'back', 'arms'], lower: ['lowerBody'], core: ['core'] },
    musculaturePerUnit: 0.004,
    /* Diminishing returns: signal units beyond this per day count at `rate`. */
    diminishing: { dailySoftCap: 40, rate: 0.35 },
    /* Hard caps per attribute (kept generous; tuning is Phase 1+). */
    caps: { strength: 999, hypertrophy: 999, power: 999, endurance: 999, control: 999, defense: 999, quickness: 999, mahgicCapacity: 999, mahgicRecovery: 999 },
    mahgic: { capacityPerCapacityPoint: 10, recoveryPerRecoveryPoint: 0.1 }
  });
  var balance = BALANCE_V0;
  /* Everything the adapter dereferences must be present in a replacement
     table; a half table would turn derive() into exceptions at run time. */
  var BALANCE_SECTIONS = deepFreeze(['classify', 'xp', 'attributes', 'musculature', 'diminishing', 'caps', 'mahgic']);
  function setBalance(table) {
    if (!isObj(table) || !table.version || !isObj(table.curve)) throw new Error('A balance table needs a version and a curve');
    var missing = BALANCE_SECTIONS.filter(function (k) { return !isObj(table[k]); });
    if (typeof table.musculaturePerUnit !== 'number') missing.push('musculaturePerUnit');
    if (missing.length) throw new Error('A balance table needs every section: ' + missing.join(', '));
    var c = table.curve, max = num(c.maxLevel, 100);
    if (!(max >= 2 && max <= 100)) throw new Error('curve.maxLevel must be between 2 and 100');
    if (c.kind === 'table') { if (!Array.isArray(c.values) || c.values.length < max) throw new Error('a table curve needs a value for every level up to maxLevel'); }
    else if (c.kind !== 'quadratic' || !(num(c.base) > 0) || !(num(c.growth) > 0)) throw new Error('curve.kind must be quadratic (base, growth) or table (values)');
    if (!(num(table.classify.heavyMaxReps) > 0) || !(num(table.classify.hypertrophyMaxReps) >= num(table.classify.heavyMaxReps))) throw new Error('classify thresholds are invalid');
    if (!(num(table.diminishing.dailySoftCap) >= 0) || !(num(table.diminishing.rate) >= 0 && num(table.diminishing.rate) <= 1)) throw new Error('diminishing returns are invalid');
    balance = deepFreeze(clone(table));
    return balance;
  }
  function getBalance() { return balance; }

  /* ------------------------------------------------------------------ */
  /* PROGRESSION — LEVEL 1..100 representable now, curve replaceable.    */
  var Progression = {
    contract: 'mahworld.WorldProgression',
    version: 1,
    create: function (extra) {
      return assign({
        contract: Progression.contract, version: Progression.version,
        level: 1, lifetimeXp: 0, xpIntoLevel: 0, xpForNextLevel: Progression.xpForLevel(2),
        progressToNext: 0, milestones: [], curveVersion: balance.version
      }, extra || {});
    },
    /* XP required to REACH `level` (cumulative). Level 1 costs nothing. */
    xpForLevel: function (level, table) {
      var t = table || balance; var c = t.curve; var L = clamp(Math.floor(num(level, 1)), 1, c.maxLevel || 100);
      if (L <= 1) return 0;
      if (c.kind === 'table' && Array.isArray(c.values)) return num(c.values[L - 1]);
      /* quadratic default: sum of base * i^growth for i in 1..L-1 */
      var total = 0;
      for (var i = 1; i < L; i++) total += c.base * Math.pow(i, c.growth);
      return Math.round(total);
    },
    levelForXp: function (xp, table) {
      var t = table || balance; var max = (t.curve && t.curve.maxLevel) || 100; var x = Math.max(0, num(xp));
      var L = 1;
      while (L < max && x >= Progression.xpForLevel(L + 1, t)) L++;
      return L;
    },
    fromLifetimeXp: function (xp, table) {
      var t = table || balance; var x = Math.max(0, num(xp));
      var L = Progression.levelForXp(x, t);
      var floor = Progression.xpForLevel(L, t), next = L >= ((t.curve && t.curve.maxLevel) || 100) ? floor : Progression.xpForLevel(L + 1, t);
      var span = Math.max(1, next - floor);
      return {
        contract: Progression.contract, version: Progression.version,
        level: L, lifetimeXp: x, xpIntoLevel: x - floor, xpForNextLevel: next,
        progressToNext: L >= ((t.curve && t.curve.maxLevel) || 100) ? 1 : clamp((x - floor) / span, 0, 1),
        milestones: [], curveVersion: t.version
      };
    },
    addXp: function (prog, xp, table) {
      var out = Progression.fromLifetimeXp(num(prog && prog.lifetimeXp) + Math.max(0, num(xp)), table);
      out.milestones = (prog && prog.milestones) ? prog.milestones.slice() : [];
      return out;
    },
    MAX_LEVEL: 100
  };

  /* ------------------------------------------------------------------ */
  /* ABILITY contract (§29) — no roster.                                  */
  var ABILITY_FIELDS = deepFreeze(['id', 'name', 'sourceCategory', 'unlock', 'attributeDependencies', 'mahgicCost', 'damage', 'defense', 'speed', 'precision', 'range', 'cooldownSeconds', 'traversalComponent', 'movementComponent', 'constructType']);
  var Ability = {
    contract: 'mahworld.Ability',
    version: 1,
    fields: ABILITY_FIELDS,
    create: function (spec) {
      var s = isObj(spec) ? spec : {};
      if (!s.id) throw new Error('Ability requires an id');
      var a = { contract: Ability.contract, version: Ability.version };
      ABILITY_FIELDS.forEach(function (k) { a[k] = s[k] == null ? null : s[k]; });
      a.mahgicCost = s.mahgicCost == null ? 0 : Math.max(0, num(s.mahgicCost));
      a.unlock = isObj(s.unlock) ? s.unlock : { level: null, attributes: {}, sourceRequirement: null };
      a.attributeDependencies = isObj(s.attributeDependencies) ? s.attributeDependencies : {};
      return a;
    },
    /* Can this profile use this ability right now? Pure. */
    isUnlocked: function (ability, profile) {
      if (!isObj(ability) || !isObj(profile)) return false;
      var u = ability.unlock || {};
      if (u.level != null && num(profile.progression && profile.progression.level, 1) < num(u.level)) return false;
      var req = isObj(u.attributes) ? u.attributes : {};
      for (var k in req) if (Object.prototype.hasOwnProperty.call(req, k) && num(profile.attributes && profile.attributes[k]) < num(req[k])) return false;
      return true;
    }
  };

  /* TRAVERSAL (§30) — tiers reserved, no physics, no unlock levels. */
  var TRAVERSAL_TIERS = deepFreeze(['walk', 'sprint', 'jump', 'enhanced-jump', 'climb', 'levitate', 'sustained-levitate', 'fly', 'aerial-control']);
  var Traversal = {
    contract: 'mahworld.Traversal',
    version: 1,
    tiers: TRAVERSAL_TIERS,
    create: function (extra) {
      return assign({ contract: Traversal.contract, version: Traversal.version, tier: 'walk', unlocked: ['walk'] }, extra || {});
    },
    unlock: function (t, tier) {
      if (TRAVERSAL_TIERS.indexOf(tier) < 0) return t;
      var out = clone(t);
      if (out.unlocked.indexOf(tier) < 0) out.unlocked.push(tier);
      /* the highest unlocked tier by order becomes the current tier */
      var best = 0; out.unlocked.forEach(function (u) { best = Math.max(best, TRAVERSAL_TIERS.indexOf(u)); });
      out.tier = TRAVERSAL_TIERS[best];
      return out;
    }
  };

  /* INVENTORY boundary (§41) — no economy, no trading, no blockchain. */
  var Inventory = {
    contract: 'mahworld.Inventory',
    version: 1,
    kinds: deepFreeze(['cosmetic', 'construct', 'trophy', 'consumable']),
    create: function (ownerAccountId) {
      return { contract: Inventory.contract, version: Inventory.version, ownerAccountId: String(ownerAccountId || ''), items: [] };
    },
    add: function (inv, item) {
      var it = isObj(item) ? item : {};
      if (Inventory.kinds.indexOf(it.kind) < 0 || !it.id) return inv;
      var out = clone(inv); out.items.push({ id: String(it.id), kind: it.kind, qty: Math.max(1, num(it.qty, 1)), meta: it.meta || null });
      return out;
    }
  };

  /* ------------------------------------------------------------------ */
  /* PRESENCE / LOCATION PRIVACY. LOCKED (brief §35, bridge §7).         */
  /* Device location is never public presence. A public payload can      */
  /* carry an abstraction level and its coarse reference, nothing finer. */
  var PRESENCE_LEVELS = deepFreeze(['hidden', 'region', 'venue', 'instance', 'room']);
  var FORBIDDEN_PRESENCE_KEYS = deepFreeze(['latitude', 'longitude', 'lat', 'lng', 'lon', 'latlng', 'coords', 'coordinates', 'geo', 'geohash', 'geolocation', 'location', 'position', 'accuracy', 'altitude', 'gps']);
  /* A public reference is an OPAQUE STRING ID and nothing else: no objects,
     no arrays, no numbers, nothing coordinate-shaped, no geo: URI, bounded
     length. The allow-list is by shape, the denylist above is defence in
     depth — a name we did not think of cannot carry a position through. */
  var REF_MAX_LENGTH = 64;
  var COORDINATE_PAIR = /-?\d{1,3}(?:\.\d+)?\s*[,;/ ]\s*-?\d{1,3}\.\d{2,}/;
  var GEO_URI = /^\s*geo:/i;
  function looksLikeLocation(s) { return COORDINATE_PAIR.test(s) || GEO_URI.test(s); }
  function opaqueRef(v) {
    if (typeof v !== 'string') return null;
    var s = v.trim();
    if (!s || s.length > REF_MAX_LENGTH || looksLikeLocation(s)) return null;
    return s;
  }
  var Presence = {
    contract: 'mahworld.Presence',
    version: 1,
    levels: PRESENCE_LEVELS,
    forbiddenKeys: FORBIDDEN_PRESENCE_KEYS,
    refMaxLength: REF_MAX_LENGTH,
    opaqueRef: opaqueRef,
    create: function (extra) {
      return assign({
        contract: Presence.contract, version: Presence.version,
        optIn: false, level: 'hidden',
        regionRef: null, venueRef: null, instanceRef: null, roomRef: null, shardRef: null,
        updatedAt: nowIso()
      }, extra || {});
    },
    /* What another player may see. Returns null when presence is off. */
    toPublicPayload: function (profile, presence) {
      if (!isObj(profile) || !isObj(presence)) return null;
      if (profile.presenceOptIn !== true || presence.optIn !== true || presence.level === 'hidden') return null;
      if (PRESENCE_LEVELS.indexOf(presence.level) < 0) return null;
      var out = { displayRef: opaqueRef(profile.displayRef), level: presence.level };
      if (presence.level === 'region') out.regionRef = opaqueRef(presence.regionRef);
      if (presence.level === 'venue') { out.regionRef = opaqueRef(presence.regionRef); out.venueRef = opaqueRef(presence.venueRef); }
      if (presence.level === 'instance') { out.instanceRef = opaqueRef(presence.instanceRef); out.shardRef = opaqueRef(presence.shardRef); }
      if (presence.level === 'room') { out.roomRef = opaqueRef(presence.roomRef); }
      return Presence.assertNoPreciseLocation(out);
    },
    /* Strips (and reports) any precise-location key or location-shaped
       string value, recursively. Defence in depth behind opaqueRef. */
    assertNoPreciseLocation: function (payload) {
      function scrub(o) {
        if (!o || typeof o !== 'object') return o;
        Object.keys(o).forEach(function (k) {
          var v = o[k];
          if (FORBIDDEN_PRESENCE_KEYS.indexOf(String(k).toLowerCase()) > -1) delete o[k];
          else if (typeof v === 'string' && looksLikeLocation(v)) o[k] = null;
          else scrub(v);
        });
        return o;
      }
      return scrub(payload);
    },
    containsPreciseLocation: function (payload) {
      var found = false;
      (function walk(o) {
        if (found || !o || typeof o !== 'object') return;
        Object.keys(o).forEach(function (k) {
          var v = o[k];
          if (FORBIDDEN_PRESENCE_KEYS.indexOf(String(k).toLowerCase()) > -1) found = true;
          else if (typeof v === 'string' && looksLikeLocation(v)) found = true;
          else walk(v);
        });
      })(payload);
      return found;
    }
  };

  /* ------------------------------------------------------------------ */
  /* FITNESS -> SIGNAL -> PROGRESSION ADAPTER (§25). The ONLY door        */
  /* through which MAHFITT truth reaches MAHWORLD. Inputs are plain      */
  /* records shaped like MAHFITT's own (see the foundation document's    */
  /* "Fitness record shapes"); the adapter never mutates them, never     */
  /* stores them, never re-derives fitness history.                      */
  var SIGNAL_KINDS = deepFreeze(['strength', 'hypertrophy', 'power', 'endurance', 'control', 'activity', 'body']);
  var BODY_REGIONS = deepFreeze(['upper', 'lower', 'core', 'full']);

  function classifySet(set, table) {
    var t = table || balance;
    var reps = num(set && set.reps);
    if (set && set.explosive === true) return 'power';
    if (set && set.control === true) return 'control';
    if (reps <= 0) return null;
    if (reps <= t.classify.heavyMaxReps) return 'strength';
    if (reps <= t.classify.hypertrophyMaxReps) return 'hypertrophy';
    return 'endurance';
  }

  var signals = {
    kinds: SIGNAL_KINDS,
    regions: BODY_REGIONS,
    classifySet: classifySet,
    /* A completed workout in MAHFITT's own shape: { id, completedAt|date|endedAt,
       items|exercises: [ { name, region ('upper'|'lower'|'core'|'full'), sets: [ { reps, weight, done } ] } ] }.
       MAHFITT's completion flag is `done` (the 'finish' body filters on st.done);
       `completed` is accepted as an alias. Completion FAILS CLOSED: a set with
       neither flag true is not a signal (LIVE-004: completion is real completed
       sets). A signal carries no record detail — only a source reference. */
    normalizeWorkout: function (w, table) {
      var t = table || balance; var out = [];
      if (!isObj(w)) return out;
      var when = w.completedAt || w.date || w.endedAt || null;
      var exercises = Array.isArray(w.items) ? w.items : (Array.isArray(w.exercises) ? w.exercises : []);
      exercises.forEach(function (ex) {
        if (!isObj(ex)) return;
        var region = BODY_REGIONS.indexOf(ex.region) > -1 ? ex.region : 'full';
        var sets = Array.isArray(ex.sets) ? ex.sets : [];
        sets.forEach(function (s, setIndex) {
          if (!isObj(s) || !(s.done === true || s.completed === true)) return;
          var kind = classifySet(s, t);
          if (!kind) return;
          var weight = Math.max(0, num(s.weight));
          /* One normalised unit is one working set; load scales it gently. */
          var units = 1 + Math.min(1, weight / 100) * 0.5;
          out.push({ kind: kind, units: units, region: region, at: when, source: { type: 'workout', id: w.id || null, setIndex: setIndex } });
        });
      });
      return out;
    },
    /* An activity: { id, type ('walk'|'run'|'cycling'|'hiking'|'fobbing'|'misc'|sport), distanceMeters, durationSeconds, steps, completedAt } */
    normalizeActivity: function (a) {
      if (!isObj(a)) return [];
      var minutes = Math.max(0, num(a.durationSeconds)) / 60;
      var km = Math.max(0, num(a.distanceMeters)) / 1000;
      var units = minutes / 10 + km * 0.5;     /* ten minutes or two kilometres = one unit */
      if (units <= 0) return [];
      return [{ kind: 'activity', units: units, region: 'lower', at: a.completedAt || a.endedAt || null, source: { type: 'activity', id: a.id || null, activityType: a.type || 'misc' } }];
    },
    /* A body measurement: { recordedAt, weightKg, bodyFatPct, ffmi } — a
       body signal is a small, steady acknowledgement, never a lever. */
    normalizeBody: function (b) {
      if (!isObj(b)) return [];
      return [{ kind: 'body', units: 1, region: 'full', at: b.recordedAt || null, source: { type: 'body', hasWeight: b.weightKg != null, hasBodyFat: b.bodyFatPct != null } }];
    }
  };

  /* Derivation: signals -> { version, signalCount, xp, attributeDeltas, musculatureDeltas, mahgicDelta } — PURE.
     Diminishing returns are applied per UTC calendar day of the signal. */
  function dayKey(at) {
    if (at == null || at === '') return 'undated';
    var d = new Date(at);
    return isFinite(+d) ? d.toISOString().slice(0, 10) : 'undated';
  }
  function derive(signalList, table) {
    var t = table || balance;
    var list = Array.isArray(signalList) ? signalList : [];
    var perDay = {};
    var xp = 0, counted = 0, attributeDeltas = {}, musculatureDeltas = {};
    ATTRIBUTE_KEYS.forEach(function (k) { attributeDeltas[k] = 0; });
    ['shoulders', 'chest', 'back', 'arms', 'core', 'lowerBody'].forEach(function (k) { musculatureDeltas[k] = 0; });
    list.forEach(function (s) {
      if (!isObj(s) || SIGNAL_KINDS.indexOf(s.kind) < 0) return;
      counted++;
      var day = dayKey(s.at);
      var used = perDay[day] || 0;
      var raw = Math.max(0, num(s.units));
      var soft = t.diminishing.dailySoftCap, rate = t.diminishing.rate;
      var effective = used >= soft ? raw * rate : (used + raw <= soft ? raw : (soft - used) + (used + raw - soft) * rate);
      perDay[day] = used + raw;
      xp += effective * num(t.xp[s.kind]);
      var map = t.attributes[s.kind] || {};
      Object.keys(map).forEach(function (k) { if (attributeDeltas[k] != null) attributeDeltas[k] += effective * num(map[k]); });
      if (s.kind === 'strength' || s.kind === 'hypertrophy' || s.kind === 'power') {
        var regions = t.musculature[s.region] || (s.region === 'full' ? t.musculature.upper.concat(t.musculature.lower, t.musculature.core) : []);
        regions.forEach(function (r) { musculatureDeltas[r] += effective * t.musculaturePerUnit / Math.max(1, regions.length / 2); });
      }
    });
    var mahgicDelta = {
      capacity: attributeDeltas.mahgicCapacity * t.mahgic.capacityPerCapacityPoint,
      recoveryPerMinute: attributeDeltas.mahgicRecovery * t.mahgic.recoveryPerRecoveryPoint
    };
    return { version: t.version, signalCount: counted, xp: Math.round(xp), attributeDeltas: attributeDeltas, musculatureDeltas: musculatureDeltas, mahgicDelta: mahgicDelta };
  }

  /* ------------------------------------------------------------------ */
  /* ANTI-EXPLOIT BOUNDARY (§27). A client may PREVIEW a derivation; only */
  /* a server-validated derivation is authoritative. The profile records  */
  /* which it is, so a server can always recompute from MAHFITT truth.    */
  var AUTHORITY = deepFreeze({ PREVIEW: 'client-preview', SERVER: 'server-validated' });
  var antiExploit = {
    AUTHORITY: AUTHORITY,
    /* What a derivation must look like to be applied at all: the full shape
       `derive` produces, under the CURRENT balance version. A bare XP number,
       a stale or foreign version, or missing deltas are refused outright. */
    validateDerivation: function (derivation) {
      var errs = [];
      if (!isObj(derivation)) return ['not an object'];
      if (derivation.version !== balance.version) errs.push('version');
      if (!(typeof derivation.xp === 'number' && isFinite(derivation.xp) && derivation.xp >= 0 && Math.floor(derivation.xp) === derivation.xp)) errs.push('xp');
      if (!(typeof derivation.signalCount === 'number' && derivation.signalCount >= 0)) errs.push('signalCount');
      if (!isObj(derivation.attributeDeltas)) errs.push('attributeDeltas');
      if (!isObj(derivation.musculatureDeltas)) errs.push('musculatureDeltas');
      if (!isObj(derivation.mahgicDelta)) errs.push('mahgicDelta');
      return errs;
    },
    /* Applies a derivation to a profile. Never accepts a bare XP number:
       the input is a derivation object produced by `derive`, carrying the
       current balance version and every delta. Preview results are marked
       and are never a claim; only the server can make a profile 'server'. */
    applyDerivation: function (profile, derivation, options) {
      var o = options || {};
      if (!isObj(profile)) throw new Error('applyDerivation needs a profile');
      var bad = antiExploit.validateDerivation(derivation);
      if (bad.length) throw new Error('applyDerivation refused the derivation (' + bad.join(', ') + ')');
      var authority = o.authority === AUTHORITY.SERVER ? AUTHORITY.SERVER : AUTHORITY.PREVIEW;
      var out = clone(profile);
      out.progression = Progression.addXp(out.progression, derivation.xp);
      out.attributes = FitnessAttributes.add(out.attributes, derivation.attributeDeltas, balance.caps);
      out.mahgic = assign(clone(out.mahgic), {
        capacity: Math.max(0, num(out.mahgic.capacity) + num(derivation.mahgicDelta.capacity)),
        recoveryPerMinute: Math.max(0, num(out.mahgic.recoveryPerMinute) + num(derivation.mahgicDelta.recoveryPerMinute))
      });
      out.mahgic.current = Math.min(num(out.mahgic.current), out.mahgic.capacity);
      out.authority = authority === AUTHORITY.SERVER ? 'server' : 'local-draft';
      out.lastDerivation = { version: derivation.version, xp: derivation.xp, signalCount: derivation.signalCount, authority: authority, at: nowIso() };
      out.updatedAt = nowIso();
      return out;
    }
  };

  /* ------------------------------------------------------------------ */
  /* LOCAL DRAFT STORE — PROVISIONAL (§19 "do not prematurely finalize    */
  /* persistence"). Namespaced by owner account so two accounts on one    */
  /* device never share a draft. Never authoritative.                     */
  var STORE_PREFIX = 'fob.mahworld.profile.v0.';
  var store = {
    keyFor: function (ownerAccountId) { return STORE_PREFIX + String(ownerAccountId || ''); },
    load: function (ownerAccountId) {
      if (!ownerAccountId) return null;
      var raw = readStorage(store.keyFor(ownerAccountId));
      if (!raw) return null;
      try {
        var p = JSON.parse(raw);
        if (WorldProfile.validate(p).length) return null;
        /* A LOCAL draft is never server authority, whatever it claims. */
        p.authority = 'local-draft';
        if (isObj(p.lastDerivation)) p.lastDerivation.authority = AUTHORITY.PREVIEW;
        return p;
      } catch (e) { return null; }
    },
    save: function (profile) {
      if (!isObj(profile) || !profile.ownerAccountId) return false;
      if (WorldProfile.validate(profile).length) return false;
      return writeStorage(store.keyFor(profile.ownerAccountId), JSON.stringify(profile));
    },
    clear: function (ownerAccountId) { return writeStorage(store.keyFor(ownerAccountId), null); }
  };

  /* ------------------------------------------------------------------ */
  /* MAHTROPOLIS — destination map (§39, §40). Each world destination     */
  /* REPRESENTS an existing MAHFITT owner; the `mahfittRoute` is the app's */
  /* own navigation view id, so a portal can only ever open the canonical */
  /* MAHFITT destination. Routes are filled from the audited navigation   */
  /* table; `null` means no MAHFITT surface yet (a later-phase system).   */
  /* MAH PLAYER is not a route — it is an overlay the app opens through   */
  /* its own `music-studio` action — so that destination carries          */
  /* `mahfittAction` instead and the portal asks the bound `openAction`.  */
  var MAHTROPOLIS = deepFreeze([
    { id: 'program-gym',   label: 'Program Gym',        mahfittOwner: 'Program system (MAH PROGRAMS / OUTDOOR/FOB, Program Library)', mahfittRoute: 'home' },
    { id: 'training-room', label: 'Training Room',      mahfittOwner: 'Exercise education + Program Tools (canonical exercise data)', mahfittRoute: null, status: 'future' },
    { id: 'progress',      label: 'Progress',           mahfittOwner: 'MAH Progress / Body data', mahfittRoute: 'progress' },
    { id: 'calendar',      label: 'Calendar',           mahfittOwner: 'MAH Calendar', mahfittRoute: 'calendar' },
    { id: 'health',        label: 'Health / Recovery',  mahfittOwner: 'MAH Health / Activity', mahfittRoute: 'health' },
    { id: 'media',         label: 'MAH Media',          mahfittOwner: 'MAH Media (progress media)', mahfittRoute: 'mah-media' },
    { id: 'player',        label: 'MAH Player',         mahfittOwner: 'MAH Player — the ONE music owner (signed-in account)', mahfittRoute: null, mahfittAction: 'music-studio' },
    { id: 'shop',          label: 'Shopping Hub',       mahfittOwner: null, mahfittRoute: null, status: 'future' },
    { id: 'mrmah',         label: 'Mr. Mah / AI',       mahfittOwner: 'Canonical MAHFITT AI entry (AI Chat / MAH Protocol)', mahfittRoute: 'mahfitt-ai' },
    { id: 'social',        label: 'Protected social spaces', mahfittOwner: 'FOB COMMUNITY (later phase) / coach-member messaging', mahfittRoute: null, status: 'future' },
    { id: 'gates',         label: 'Exits to open-world regions', mahfittOwner: null, mahfittRoute: null, status: 'future' }
  ]);

  /* Reserved system namespaces — contract / name only, no mechanics. */
  var reserved = deepFreeze({
    MAHMATCH:      { status: 'reserved', concept: 'opt-in, ~five-minute, exercise-inspired competitive experience', sessionState: 'separate from persistent progression' },
    RACING:        { status: 'reserved', concept: 'multiplayer traversal competition', sessionState: 'separate from persistent progression' },
    TRAINING_ROOM: { status: 'reserved', concept: 'exercise education, ability configuration, progression understanding; draws exercise truth from MAHFITT' },
    FOBBING:       { status: 'reserved', concept: 'namespace only; mechanics not invented in Phase 0' }
  });

  /* Music: the world never owns music. Documented as data so tests can pin it. */
  var music = deepFreeze({ owner: 'MAH PLAYER', ownerScope: 'signed-in account', worldPolicy: 'represent-or-control-the-same-owner', secondQueue: false });

  /* ------------------------------------------------------------------ */
  /* ADAPTER BINDING. The app shell supplies what the domain must not     */
  /* discover on its own. Everything is optional; unbound adapters return */
  /* neutral values so the shell can load this file first and bind later. */
  var bound = { getAccountContext: null, getThemeAccent: null, navigate: null, openAction: null, log: null, flag: null };
  function bind(adapters) {
    var a = isObj(adapters) ? adapters : {};
    ['getAccountContext', 'getThemeAccent', 'navigate', 'openAction', 'log'].forEach(function (k) { if (typeof a[k] === 'function') bound[k] = a[k]; });
    if (a.flag === true || a.flag === false) flagOverride = a.flag;
    if (a.flag === null) flagOverride = null;
    return api;
  }
  function accountContext() {
    try { return bound.getAccountContext ? (bound.getAccountContext() || {}) : {}; } catch (e) { return {}; }
  }
  /* The world's energy colour DERIVES from the account Theme's Secondary
     (--bright-rgb) — it never owns or writes a Theme (§37). */
  function themeAccent() {
    try { var v = bound.getThemeAccent ? bound.getThemeAccent() : null; return v || null; } catch (e) { return null; }
  }
  /* A portal opens the canonical MAHFITT destination and nothing else:
     a route through the app's own navigation, or an app-owned overlay
     (MAH PLAYER) through the app's own action. Never both, never a copy. */
  function destinationOpens(d) { return !!(d && d.status !== 'future' && (d.mahfittRoute || d.mahfittAction)); }
  function openDestination(id) {
    var d = null; for (var i = 0; i < MAHTROPOLIS.length; i++) if (MAHTROPOLIS[i].id === id) d = MAHTROPOLIS[i];
    if (!destinationOpens(d)) return false;
    try {
      if (d.mahfittRoute) { if (!bound.navigate) return false; bound.navigate(d.mahfittRoute); return true; }
      if (!bound.openAction) return false;
      return bound.openAction(d.mahfittAction) !== false;
    } catch (e) { return false; }
  }

  /* Convenience for the shell: the owner and the draft profile for the
     current account, or the reason there is none. */
  function currentOwner() { return identity.resolveOwner(accountContext()); }
  function currentProfile() {
    var owner = currentOwner();
    if (!owner.ok) return { ok: false, reason: owner.reason, profile: null };
    return { ok: true, reason: 'SELF', profile: store.load(owner.ownerAccountId) || WorldProfile.create(owner.ownerAccountId) };
  }

  var api = {
    VERSION: VERSION,
    RESOURCE_NAME: RESOURCE_NAME,
    flags: flags,
    STATES: STATES,
    TRANSITIONS: TRANSITIONS,
    PRESENTATION: PRESENTATION,
    createSession: createSession,
    presentation: presentation,
    identity: identity,
    WorldProfile: WorldProfile,
    ONBOARDING: ONBOARDING,
    Avatar: Avatar,
    FitnessAttributes: FitnessAttributes,
    Mahgic: Mahgic,
    Progression: Progression,
    Ability: Ability,
    Traversal: Traversal,
    Inventory: Inventory,
    Presence: Presence,
    signals: signals,
    derive: derive,
    antiExploit: antiExploit,
    getBalance: getBalance,
    setBalance: setBalance,
    BALANCE_V0: BALANCE_V0,
    store: store,
    MAHTROPOLIS: MAHTROPOLIS,
    reserved: reserved,
    music: music,
    bind: bind,
    themeAccent: themeAccent,
    destinationOpens: destinationOpens,
    openDestination: openDestination,
    currentOwner: currentOwner,
    currentProfile: currentProfile
  };
  return api;
});
