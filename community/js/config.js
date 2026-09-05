/* ============================================================
   FOB COMMUNITY :: CONFIG
   ------------------------------------------------------------
   These two values are browser-safe by design. The anon key is
   a public identifier; every table it can reach is protected by
   Row Level Security. It is NOT a secret.

   The SERVICE ROLE key must never appear in this file or any
   other file under /community/. It belongs only in Netlify
   environment variables, read by Netlify Functions.

   Fill these in after creating your Supabase project.
   See COMMUNITY_SETUP.md step 2.
   ============================================================ */
window.FOB_COMMUNITY_CONFIG = {
  SUPABASE_URL: 'https://hdyuolirdxnggmnpbhag.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkeXVvbGlyZHhuZ2dtbnBiaGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNDEwNzgsImV4cCI6MjEwMDYxNzA3OH0.lhxkPcUyYIrdjuIIPb1LOTV6vU0B6-ikLyaJwSgQfeE',

  // Feature flags. Left false until the backing feature ships,
  // so nothing renders a control that cannot actually work.
  /* GIF search. Fill in EITHER of these, not both. Whichever is set is
     the one used; Tenor wins if you set both.

     GIPHY is the quicker signup: developers.giphy.com > Create an App >
     choose "API" > copy the key.
     Tenor is via Google Cloud: developers.google.com/tenor/guides/quickstart

     Keys are per-project and rate limited, so this cannot ship with a
     shared value. While both are empty the GIF control does not appear
     at all, rather than appearing and failing when tapped. */
  TENOR_KEY: '',
  GIPHY_KEY: 'qEcpdAdRcOxmNA1qXLbpO4XESoGeSvos',

  // Feature flags. Left false until the backing feature ships,
  // so nothing renders a control that cannot actually work.
  FEATURES: {
    discussions: false,
    messages: false,
    gifs: true,
    voiceNotes: true,
    videoUpload: false
  },

  LIMITS: {
    avatarMaxBytes: 8 * 1024 * 1024,
    usernameMin: 3,
    usernameMax: 24,
    displayNameMax: 50,
    bioMax: 500
  },

  MINIMUM_AGE: 18
};

/* Supabase strips the URL hash once it processes it, so record a
   password-recovery arrival immediately, before the client loads. */
window.__FOB_RECOVERY =
  /type=recovery/.test(window.location.hash) ||
  /[?&]type=recovery/.test(window.location.search);
