/* MAHWORLD GAMEPLAY RUNTIME :: DEVELOPMENT REWARD RECEIPTS (Phase 5A, restart-safe in 5B)
   A small once-only boundary around the existing progression hooks. The authoritative terminal result ISSUES a receipt keyed by
   event + session + recipient + reward-rule version; APPLYING the same receipt twice never increments XP / stats / mentor completion
   twice. The claim is written BEFORE the progression hook runs, so concurrent duplicate requests inside one host process resolve to
   exactly one application.
   Phase 5B: the ledger's records are also handed to the host's durable commit (drainPending) so they land in the SAME transaction as the
   tick that settled the duel; on recovery the ledger is preloaded from the store and `apply(..., { restore: true })` re-runs the
   progression hook purely to RESTORE state in a fresh world — it writes no new record and is reported as restored, not awarded.
   HONEST LIMIT: idempotency is guaranteed within this single-host store; nothing here is a distributed exactly-once or a financial
   transaction. Replay worlds never issue receipts (issuer is the live host only). No currency, no trading. */
export function createMemoryReceiptStore() { var m = {}; return { kind: 'MEMORY_DEV', has: function (id) { return id in m; }, get: function (id) { return m[id] ? JSON.parse(JSON.stringify(m[id])) : null; }, put: function (id, rec) { m[id] = JSON.parse(JSON.stringify(rec)); }, keys: function () { return Object.keys(m); } }; }

export function createReceiptLedger(cfg, deps) {
  var d = deps || {}; var store = d.store || createMemoryReceiptStore(); var ruleVersion = cfg.dev('local_authority.reward_rule_version'); var stats = { issued: 0, applied: 0, duplicates: 0, refused: 0, restored: 0 }; var pending = [];
  function idOf(r) { return [r.event, r.session_id, r.recipient, r.rule_version].join('|'); }
  function put(id, rec) { store.put(id, rec); pending.push({ receipt_id: id, record: JSON.parse(JSON.stringify(rec)) }); }
  return {
    store: store, ruleVersion: ruleVersion,
    /* durable preload (recovery): applied records from the store become the claim set */
    preload: function (records) { Object.keys(records || {}).forEach(function (id) { store.put(id, records[id]); }); return Object.keys(records || {}).length; },
    drainPending: function () { var p = pending; pending = []; return p; },
    /* issuing is a host-only act: the caller must be the authority that observed the terminal result */
    issue: function (r) { if (!r || !r.event || !r.session_id || !r.recipient) throw new Error('receipt needs event, session_id, recipient'); var rec = { receipt_id: idOf({ event: r.event, session_id: r.session_id, recipient: r.recipient, rule_version: ruleVersion }), event: r.event, session_id: r.session_id, recipient: r.recipient, rule_version: ruleVersion, outcome: r.outcome || null, issued_at: r.issued_at === undefined ? null : r.issued_at, classification: 'DEVELOPMENT_REWARD' }; stats.issued++; return rec; },
    /* apply(receipt, fn, opts): claim first, then run the progression hook exactly once; every later apply of the same id is a no-op.
       opts.restore: reconstruction mode — an APPLIED record re-runs fn to restore progression state, writes nothing, counts as restored. */
    apply: function (receipt, fn, opts) {
      if (!receipt || !receipt.receipt_id) return { applied: false, reason: 'BAD_RECEIPT' };
      if (receipt.rule_version !== ruleVersion) { stats.refused++; return { applied: false, reason: 'RULE_VERSION_MISMATCH', expected: ruleVersion, got: receipt.rule_version }; }
      if (store.has(receipt.receipt_id)) { var first = store.get(receipt.receipt_id); if (opts && opts.restore && first.status === 'APPLIED') { var rr; try { rr = fn(receipt); } catch (e) { return { applied: false, restored: false, reason: 'RESTORE_FAILED', error: String(e && e.message || e) }; } stats.restored++; return { applied: false, restored: true, result: rr, first: first }; } stats.duplicates++; return { applied: false, reason: 'ALREADY_APPLIED', first: first }; }
      if (opts && opts.restore) { stats.refused++; return { applied: false, reason: 'NOT_IN_STORE_DURING_RESTORE' }; }   /* reconstruction must never mint a receipt the committed history does not contain */
      put(receipt.receipt_id, { receipt_id: receipt.receipt_id, status: 'CLAIMED', recipient: receipt.recipient, event: receipt.event, session_id: receipt.session_id });
      var result; try { result = fn(receipt); } catch (e) { put(receipt.receipt_id, { receipt_id: receipt.receipt_id, status: 'FAILED', error: String(e && e.message || e) }); stats.refused++; return { applied: false, reason: 'HOOK_FAILED', error: String(e && e.message || e) }; }
      put(receipt.receipt_id, { receipt_id: receipt.receipt_id, status: 'APPLIED', recipient: receipt.recipient, event: receipt.event, session_id: receipt.session_id, outcome: receipt.outcome, result: result === undefined ? null : result }); stats.applied++; return { applied: true, result: result };
    },
    record: function (id) { return store.get(id); }, stats: function () { return Object.assign({}, stats); }
  };
}
