'use strict';
/* ══ SMALL GROUP ACCESS GATE :: SERVER SIDE ════════════════════════════════

   The single source of truth for who can reach small group. Every other
   layer follows this one: claim-status.js reports it to the browser, the
   payment page uses that to lock its button, /small-group-access uses it to
   refuse to render, and group-access.js and group-checkout.js enforce it so
   the API cannot be called around the UI.

   ─────────────────────────────────────────────────────────────────────────
   TO OPEN SMALL GROUP WHEN CLASSES START

   Easiest, no deploy, takes about thirty seconds:
     Netlify dashboard  ->  Site configuration  ->  Environment variables
     add   GROUP_OPEN = true
     then redeploy or wait for the next one.

   Or in code, if you would rather it be permanent:
     change DEFAULT_OPEN below to true.

   Either one opens it for everybody. Nothing else has to be undone anywhere.
   Nothing was deleted to build the locked state, so removing the flag simply
   returns the feature to how it always behaved.

   TO ADD SOMEONE EARLY, without opening it to all
     env var   GROUP_ALLOW = jah fobin, garret bearthal
     (comma separated full names, case and spacing do not matter)
     or add them to DEFAULT_ALLOW below.

   The env var, when set, REPLACES the code list rather than adding to it, so
   whatever you put in the dashboard is exactly the list in force.
   ───────────────────────────────────────────────────────────────────────── */

const P = require('./_payment');

const DEFAULT_OPEN = false;
const DEFAULT_ALLOW = ['Jah Fobin'];

function isOpen() {
  const raw = String(process.env.GROUP_OPEN == null ? '' : process.env.GROUP_OPEN)
    .trim().toLowerCase();
  if (raw === 'true' || raw === '1' || raw === 'yes' || raw === 'on') return true;
  if (raw === 'false' || raw === '0' || raw === 'no' || raw === 'off') return false;
  return DEFAULT_OPEN;
}

/* Normalized with the same function the member lookup uses, so a name here
   matches a name in the ledger by exactly the same rules. */
function allowList() {
  const raw = String(process.env.GROUP_ALLOW == null ? '' : process.env.GROUP_ALLOW).trim();
  const src = raw ? raw.split(',') : DEFAULT_ALLOW;
  return src.map(P.normalize).filter(Boolean);
}

/* Answers from a member row that has already been read, so callers holding
   one do not pay for a second query. */
function allowsMember(row) {
  if (!P.hasSessionAccess(row)) return false;
  if (isOpen()) return true;
  if (!row) return false;
  const full = P.normalize((row.first_name || '') + ' ' + (row.last_name || ''));
  return allowList().indexOf(full) !== -1;
}

/* Answers from a claim cookie id. Used by the two group endpoints, which
   know who the member is but have not read their row. Fails closed: a
   missing member, an inactive member or a database error all deny. */
async function allowsClaimId(id) {
  if (!id) return false;
  try {
    const row = await P.memberWithAccess(id, 'first_name,last_name,active,sesh_left');
    return allowsMember(row);
  } catch (e) {
    return false;
  }
}

/* One refusal, so both endpoints say the same thing and the browser can
   recognise it by comingSoon rather than by matching on the message. */
const DENIED = {
  ok: false,
  comingSoon: true,
  error: 'Small group FOB SESH is not open yet. Your private sessions are unaffected.'
};

function deny(headers) {
  return { statusCode: 403, headers: headers, body: JSON.stringify(DENIED) };
}

module.exports = { isOpen, allowList, allowsMember, allowsClaimId, deny, DENIED };
