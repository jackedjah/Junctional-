/* ============================================================
   FOB COMMUNITY :: SUPABASE CLIENT
   Loaded as a classic script (no bundler) to match the existing
   static Netlify deployment. supabase-js v2 is pulled from the
   CDN in each page's <head>.
   ============================================================ */
(function () {
  'use strict';

  var cfg = window.FOB_COMMUNITY_CONFIG || {};
  var configured =
    cfg.SUPABASE_URL &&
    cfg.SUPABASE_ANON_KEY &&
    cfg.SUPABASE_URL.indexOf('YOUR_SUPABASE') === -1 &&
    cfg.SUPABASE_ANON_KEY.indexOf('YOUR_SUPABASE') === -1;

  window.FOB = window.FOB || {};
  window.FOB.configured = !!configured;

  if (!configured) {
    // Fail loudly and honestly rather than throwing opaque
    // errors on every call. The banner is rendered by utilities.
    window.FOB.supabase = null;
    console.warn(
      '[FOB Community] Supabase is not configured. ' +
      'Set SUPABASE_URL and SUPABASE_ANON_KEY in community/js/config.js. ' +
      'See COMMUNITY_SETUP.md.'
    );
    return;
  }

  if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
    window.FOB.supabase = null;
    window.FOB.configured = false;
    console.error('[FOB Community] supabase-js failed to load from CDN.');
    return;
  }

  window.FOB.supabase = window.supabase.createClient(
    cfg.SUPABASE_URL,
    cfg.SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'fob-community-auth'   // distinct from the Form Review cookie
      }
    }
  );
})();
