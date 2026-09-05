/* ══ FOB SYSTEMS :: SMALL GROUP, BROWSER SIDE ══════════════════════════════
   This file no longer decides anything. The decision lives on the server in
   netlify/functions/_group-gate.js, and /api/claim-status reports it as
   groupAllowed on the response both pages already fetch. That keeps the
   locked button, the /small-group-access page and the two group endpoints
   reading one answer instead of three copies that could drift.

   TO OPEN SMALL GROUP: see the instructions at the top of
   netlify/functions/_group-gate.js. Nothing needs changing in this file.

   Fails closed. If the field is missing for any reason, the answer is no.
   ═══════════════════════════════════════════════════════════════════════ */
(function (w) {
  'use strict';

  /* Pass the parsed /api/claim-status response. */
  w.FOBGroupAllowed = function (status) {
    return !!(status && status.groupAllowed === true);
  };

  /* The Coming Soon panel. blocking:true removes every way out except the
     button, because on /small-group-access there is nothing behind it the
     visitor is allowed to reach. */
  w.FOBComingSoon = function (opts) {
    var o = opts || {};
    var veil = document.getElementById('soonVeil');
    if (!veil) return;
    if (o.blocking) {
      var btn = veil.querySelector('#soonClose');
      if (btn) {
        btn.textContent = 'Back to FOB SESH Access';
        btn.onclick = function () { location.replace('/claim-your-slot'); };
      }
    }
    veil.classList.add('open');
  };
}(window));
