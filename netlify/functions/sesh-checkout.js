/* SESH checkout handoff.
   Payment links live here, not in the page, so the client never ships the
   full set. Each can be overridden by an env var without a redeploy of the
   markup. Mirrors the shape of group-checkout so confirm.html treats both
   flows the same way. */
'use strict';
const P = require('./_payment');
const Price = require('./_sesh-pricing');

const out = (code, body) => ({
  statusCode: code,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body)
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return out(405, { ok: false, error: 'Method not allowed.' });

  let pack, schedulePlanId;
  try {
    const body = JSON.parse(event.body || '{}');
    pack = String(body.pack || '').trim();
    schedulePlanId = String(body.schedulePlanId || '').trim();
  } catch (e) {
    return out(400, { ok: false, error: 'Could not read that request.' });
  }
  /* The member never sends their own rate. It is read from the claim
     record so it cannot be tampered with from the page. */
  let range = 'standard';
  const claim = P.parseClaim(P.cookie(event.headers || {}));
  if (!claim || !claim.id) {
    return out(401, { ok: false, locked: true, error: 'Member access is locked. Contact Jah directly.' });
  }
  {
    /* One retry: PostgREST can briefly 400 on a freshly added column while
       its schema cache catches up, and that should not cost a sale. If it
       still fails we refuse rather than guess, because guessing "standard"
       for an Extended member would undercharge them. */
    let rows = null, lastErr = null;
    for (let attempt = 0; attempt < 2 && !rows; attempt++) {
      try {
        const member = await P.memberWithAccess(claim.id,
          'id,location_rate,active,sesh_left,gym_only', { fullOnly: true });
        rows = member ? [member] : [];
      } catch (e) {
        lastErr = e;
        if (attempt === 0) await new Promise(function (r) { setTimeout(r, 400); });
      }
    }
    if (!rows) {
      console.error('sesh-checkout: rate lookup failed.',
        lastErr && lastErr.status, JSON.stringify(lastErr && lastErr.detail).slice(0, 200));
      return out(503, { ok: false, error: 'Could not confirm your rate. Please try again in a moment.' });
    }
    if (!rows.length) {
      return out(403, { ok: false, locked: true, error: 'Member access is locked. Contact Jah directly.' });
    }
    range = Price.range(rows[0] && rows[0].location_rate);
  }

  if (!/^[0-9a-fA-F-]{36}$/.test(schedulePlanId)) {
    return out(409, { ok:false, scheduleRequired:true,
      error:'Choose your session dates in mah calendar before payment.' });
  }

  const url = Price.link(range, pack);
  const priceCents = Price.cents(range, pack);
  if (!priceCents) {
    return out(400, { ok: false, error: 'That pack is not available.' });
  }
  if (!url) {
    return out(503, { ok: false,
      error: 'Checkout for your location rate is not connected yet. Jah will send you a payment link directly.' });
  }

  /* client_reference_id is how the webhook knows whose sessions to credit.
     It is a one-use, random server ticket—not a member id—so a saved Payment
     Link or edited URL cannot be used to credit an arbitrary account. */
  let finalUrl = url;
  try {
    const ticketResult=await P.db('rpc/create_member_checkout_ticket',{
      method:'POST',body:JSON.stringify({
        p_member_id:claim.id,p_package_quantity:Number(pack),p_location_rate:range,
        p_expected_price_cents:priceCents,p_calendar_plan_id:schedulePlanId
      })
    });
    const checkoutRef=String(Array.isArray(ticketResult)?ticketResult[0]:ticketResult||'').replace(/^"|"$/g,'');
    if(!/^[0-9a-fA-F-]{36}$/.test(checkoutRef))return out(500,{ok:false,error:'Checkout security is not configured. Contact Jah directly.'});
    finalUrl += (url.indexOf('?') > -1 ? '&' : '?')
      + 'client_reference_id=' + encodeURIComponent(checkoutRef);
  } catch (e) {
    console.error('sesh-checkout: ticket creation failed',e&&e.message,e&&e.detail);
    return out(503,{ok:false,error:'Checkout could not be opened. Contact Jah directly.'});
  }

  return out(200, {
    ok: true, url: finalUrl, pack, range,
    price: priceCents / 100, schedulePlanId:schedulePlanId
  });
};
