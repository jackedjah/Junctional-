/* MAHWORLD GAMEPLAY RUNTIME :: DURABLE HOST STORE (Phase 5B — one storage interface, one engine)
   Engine: node:sqlite (DatabaseSync, built into this Node runtime; experimental in Node 22) with journal_mode=DELETE and synchronous=FULL,
   every commit inside BEGIN IMMEDIATE … COMMIT. A memory adapter with the same interface exists for isolated tests and is NOT persistent.
   Tables: meta(key,value) · journal(seq, kind, body, crc) · receipts(receipt_id, body). The journal is the authoritative ordered log of
   everything that changes host state (accounts, sessions, commands + their acknowledgements, ticks with periodic fingerprints, receipts,
   developer lifecycle actions). Recovery replays it deterministically from the known start (DuelHost.recover()).
   Single writer: a lock file next to the database holds the owning pid; a live owner is refused (never killed), a dead owner's lock is
   recorded as evidence and taken over. Clean shutdown marker: meta.clean_shutdown = '1' only when closeClean() completed.
   Assumptions (stated, not proven): local NTFS volume, SQLite's fsync-on-commit honoured by the OS, no hostile tampering (the crc catches
   accidental corruption only). Everything lives in an unmistakably DEVELOPMENT directory. */
import fs from 'node:fs'; import path from 'node:path';
export var STORE_SCHEMA_VERSION = '5B.1';
function crc(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16); }
function identityString(id) { return JSON.stringify(id, Object.keys(id).sort()); }
function pidAlive(pid) { if (!pid || pid === process.pid) return pid === process.pid; try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } }

/* ---------- memory adapter (isolated tests; NOT persistent — never call it durable) ---------- */
export function createMemoryStore() {
  var S = { open: false, meta: {}, journal: [], receipts: {}, seq: 0, hooks: { failNextCommit: false } };
  return {
    kind: 'MEMORY_DEV', persistent: false, path: null, testHooks: S.hooks,
    open: function (o) { S.open = true; var fresh = !S.meta.schema_version; if (fresh) { S.meta = { schema_version: STORE_SCHEMA_VERSION, identity: identityString(o.identity), generation: '0', clean_shutdown: '0', created_at: new Date().toISOString() }; } else if (S.meta.identity !== identityString(o.identity)) return { ok: false, reason: 'INCOMPATIBLE_STORE', detail: 'identity differs' }; var prev = fresh ? null : S.meta.clean_shutdown === '1'; S.meta.generation = String(parseInt(S.meta.generation, 10) + 1); S.meta.clean_shutdown = '0'; return { ok: true, fresh: fresh, generation: parseInt(S.meta.generation, 10), previous_clean_shutdown: prev, stale_lock_recovered: false, meta: Object.assign({}, S.meta) }; },
    commit: function (txn) { if (!S.open) return { ok: false, reason: 'STORE_CLOSED' }; if (S.hooks.failNextCommit) { S.hooks.failNextCommit = false; return { ok: false, reason: 'COMMIT_FAILED (test hook)' }; } var recs = txn.records || []; recs.forEach(function (r) { S.journal.push(Object.assign({ seq: ++S.seq }, JSON.parse(JSON.stringify(r)))); }); (txn.receipts || []).forEach(function (r) { S.receipts[r.receipt_id] = JSON.parse(JSON.stringify(r.record)); }); Object.keys(txn.meta || {}).forEach(function (k) { S.meta[k] = String(txn.meta[k]); }); return { ok: true, seq: S.seq }; },
    records: function () { return S.journal.map(function (r) { return Object.assign({}, r); }); }, receipts: function () { return JSON.parse(JSON.stringify(S.receipts)); }, meta: function () { return Object.assign({}, S.meta); }, generation: function () { return parseInt(S.meta.generation || '0', 10); },
    closeClean: function () { S.meta.clean_shutdown = '1'; S.open = false; return { ok: true }; }, simulateCrash: function () { S.open = false; return { ok: true }; }, isOpen: function () { return S.open; }
  };
}

/* ---------- SQLite adapter (the durable engine) ---------- */
export async function loadSqlite() { try { var m = await import('node:sqlite'); return m.DatabaseSync ? m : null; } catch (e) { return null; } }
export function createSqliteStore(sqlite, o) {
  if (!sqlite || !sqlite.DatabaseSync) throw new Error('node:sqlite DatabaseSync is not available in this runtime');
  var dir = o.dir; if (!/DEV_DATA_ONLY|mahworld-5b-test|DEVELOPMENT/i.test(dir)) throw new Error('refusing a data directory that is not unmistakably development-only: ' + dir);
  var file = path.join(dir, o.file || 'duel_host.sqlite'); var lockPath = file + '.lock'; var S = { db: null, open: false, hooks: { failNextCommit: false }, lockHeld: false };
  function q(sql, args) { var st = S.db.prepare(sql); return args ? st.all.apply(st, args) : st.all(); }
  function metaGet(k) { var r = S.db.prepare('SELECT value FROM meta WHERE key = ?').get(k); return r ? r.value : null; }
  function metaSet(k, v) { S.db.prepare('INSERT INTO meta(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(k, String(v)); }
  function takeLock() { fs.mkdirSync(dir, { recursive: true }); var stale = null; if (fs.existsSync(lockPath)) { var lk = null; try { lk = JSON.parse(fs.readFileSync(lockPath, 'utf8')); } catch (e) { lk = { pid: null, unreadable: true }; } if (lk && lk.pid && pidAlive(lk.pid)) return { ok: false, reason: 'LOCKED_BY_OTHER_HOST', detail: 'pid ' + lk.pid + ' owns ' + lockPath + ' — refusing (not killing, not stealing)' }; stale = lk; } fs.writeFileSync(lockPath, JSON.stringify({ pid: process.pid, owner: o.owner || 'duel-host', started_at: new Date().toISOString() })); S.lockHeld = true; return { ok: true, stale: stale }; }
  return {
    kind: 'SQLITE_NODE', persistent: true, path: file, lockPath: lockPath, testHooks: S.hooks,
    open: function (op) {
      var lk = takeLock(); if (!lk.ok) return lk;
      try { S.db = new sqlite.DatabaseSync(file); S.db.exec('PRAGMA journal_mode=DELETE'); S.db.exec('PRAGMA synchronous=FULL'); S.db.exec('CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS journal(seq INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, body TEXT NOT NULL, crc TEXT NOT NULL); CREATE TABLE IF NOT EXISTS receipts(receipt_id TEXT PRIMARY KEY, body TEXT NOT NULL)'); }
      catch (e) { this.releaseLock(); return { ok: false, reason: 'CORRUPT_STORE', detail: String(e && e.message || e), evidence: file }; }
      var jm = S.db.prepare('PRAGMA journal_mode').get().journal_mode, sy = S.db.prepare('PRAGMA synchronous').get().synchronous; if (String(jm).toLowerCase() !== 'delete' || Number(sy) !== 2) { this.releaseLock(); return { ok: false, reason: 'DURABILITY_PRAGMAS_NOT_HONOURED', detail: jm + '/' + sy }; }
      var fresh = metaGet('schema_version') === null; var prev = null; var stored = metaGet('identity');
      try {
        S.db.exec('BEGIN IMMEDIATE');
        if (fresh) { metaSet('schema_version', STORE_SCHEMA_VERSION); metaSet('identity', identityString(op.identity)); metaSet('generation', '0'); metaSet('clean_shutdown', '0'); metaSet('created_at', new Date().toISOString()); }
        else { if (metaGet('schema_version') !== STORE_SCHEMA_VERSION) { S.db.exec('ROLLBACK'); this.close(); return { ok: false, reason: 'INCOMPATIBLE_STORE', detail: 'schema ' + metaGet('schema_version') + ' != ' + STORE_SCHEMA_VERSION, evidence: file }; } if (stored !== identityString(op.identity)) { S.db.exec('ROLLBACK'); this.close(); return { ok: false, reason: 'INCOMPATIBLE_STORE', detail: 'runtime / config identity differs from the stored one (stored ' + stored + ')', evidence: file }; } prev = metaGet('clean_shutdown') === '1'; }
        var gen = parseInt(metaGet('generation'), 10) + 1; metaSet('generation', String(gen)); metaSet('clean_shutdown', '0'); metaSet('opened_at', new Date().toISOString()); if (lk.stale) metaSet('stale_lock_evidence', JSON.stringify(lk.stale)); S.db.exec('COMMIT');
      } catch (e) { try { S.db.exec('ROLLBACK'); } catch (x) { /* nothing to roll back */ } this.close(); return { ok: false, reason: 'CORRUPT_STORE', detail: String(e && e.message || e), evidence: file }; }
      S.open = true; return { ok: true, fresh: fresh, generation: gen, previous_clean_shutdown: prev, stale_lock_recovered: !!lk.stale, stale_lock: lk.stale, meta: this.meta() };
    },
    /* one atomic commit: journal records + receipt rows + meta — all or nothing, fsynced by SQLite before COMMIT returns */
    commit: function (txn) {
      if (!S.open) return { ok: false, reason: 'STORE_CLOSED' }; if (S.hooks.failNextCommit) { S.hooks.failNextCommit = false; return { ok: false, reason: 'COMMIT_FAILED (test hook)' }; }
      var last = null; try { S.db.exec('BEGIN IMMEDIATE'); var ins = S.db.prepare('INSERT INTO journal(kind, body, crc) VALUES (?, ?, ?)'); (txn.records || []).forEach(function (r) { var body = JSON.stringify(r); var res = ins.run(r.kind, body, crc(body)); last = Number(res.lastInsertRowid); }); var rins = S.db.prepare('INSERT INTO receipts(receipt_id, body) VALUES (?, ?) ON CONFLICT(receipt_id) DO UPDATE SET body = excluded.body'); (txn.receipts || []).forEach(function (r) { rins.run(r.receipt_id, JSON.stringify(r.record)); }); Object.keys(txn.meta || {}).forEach(function (k) { metaSet(k, txn.meta[k]); }); S.db.exec('COMMIT'); return { ok: true, seq: last }; }
      catch (e) { try { S.db.exec('ROLLBACK'); } catch (x) { /* already rolled back */ } return { ok: false, reason: 'COMMIT_FAILED', detail: String(e && e.message || e) }; }
    },
    records: function () { return q('SELECT seq, kind, body, crc FROM journal ORDER BY seq').map(function (r) { if (crc(r.body) !== r.crc) throw Object.assign(new Error('CORRUPT_RECORD at seq ' + r.seq + ' (crc mismatch) — evidence preserved at ' + file), { reason: 'CORRUPT_RECORD', seq: r.seq }); var b; try { b = JSON.parse(r.body); } catch (e) { throw Object.assign(new Error('CORRUPT_RECORD at seq ' + r.seq + ' (unparseable) — evidence preserved at ' + file), { reason: 'CORRUPT_RECORD', seq: r.seq }); } return Object.assign({ seq: r.seq }, b); }); },
    receipts: function () { var out = {}; q('SELECT receipt_id, body FROM receipts').forEach(function (r) { out[r.receipt_id] = JSON.parse(r.body); }); return out; },
    meta: function () { var out = {}; q('SELECT key, value FROM meta').forEach(function (r) { out[r.key] = r.value; }); return out; }, generation: function () { return parseInt(metaGet('generation') || '0', 10); },
    closeClean: function () { if (!S.open) return { ok: false, reason: 'STORE_CLOSED' }; var r = this.commit({ meta: { clean_shutdown: '1', closed_at: new Date().toISOString() } }); this.close(); return r; },
    close: function () { if (S.db) { try { S.db.close(); } catch (e) { /* already closed */ } } S.db = null; S.open = false; this.releaseLock(); },
    releaseLock: function () { if (S.lockHeld && fs.existsSync(lockPath)) { try { fs.unlinkSync(lockPath); } catch (e) { /* best effort */ } } S.lockHeld = false; },
    /* TEST ONLY: drop the handle without the clean marker and without releasing the lock file (a crash leaves both behind) */
    simulateCrash: function () { S.lockHeld = false; this.close(); return { ok: true, lock_left_behind: fs.existsSync(lockPath) }; },
    isOpen: function () { return S.open; }
  };
}
