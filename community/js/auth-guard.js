/* ============================================================
   FOB COMMUNITY :: AUTH GUARD
   Add data-fob-guard="protected" | "guest" | "onboarding" to
   <body> and this decides whether the visitor may stay.

   This is convenience routing, not security. Every table is
   protected by RLS, so a member who bypasses this guard still
   cannot read anything they are not entitled to.
   ============================================================ */
(function () {
  'use strict';

  var FOB = (window.FOB = window.FOB || {});

  function currentPath() {
    return window.location.pathname + window.location.search;
  }

  function toAuth() {
    var next = encodeURIComponent(currentPath());
    window.location.replace('/community/auth.html?next=' + next);
  }

  FOB.requireSession = function () {
    return FOB.supabase.auth.getSession().then(function (res) {
      var session = res && res.data && res.data.session;
      if (!session) { toAuth(); return null; }
      return session;
    });
  };

  FOB.loadOwnProfile = function (userId) {
    return FOB.supabase
      .from('profiles')
      .select('id, username, display_name, bio, avatar_path, card_theme, onboarding_completed, onboarding_step')
      .eq('id', userId)
      .maybeSingle()
      .then(function (res) {
        if (res.error) throw res.error;
        return res.data;
      });
  };

  FOB.signOut = function () {
    return FOB.supabase.auth.signOut().then(function () {
      window.location.replace('/community/');
    });
  };

  document.addEventListener('DOMContentLoaded', function () {
    var mode = document.body.getAttribute('data-fob-guard');
    if (!mode) return;
    if (!FOB.guardConfigured()) return;

    FOB.supabase.auth.getSession().then(function (res) {
      var session = res && res.data && res.data.session;

      /* --- guest-only pages (auth, landing) ------------------ */
      if (mode === 'guest') {
        // A recovery link creates a session. Redirecting here is what
        // locked people out: they never reached the new-password form.
        if (window.__FOB_RECOVERY) {
          document.body.removeAttribute('data-fob-pending');
          return;
        }
        if (session) {
          FOB.loadOwnProfile(session.user.id).then(function (p) {
            var dest = (p && p.onboarding_completed)
              ? '/community/discussions.html'
              : '/community/onboarding.html';
            window.location.replace(FOB.redirectParam() || dest);
          }).catch(function () {
            /* A zero-session linked member is denied by the live restrictive
               RLS gate. Clear the stale Supabase session instead of leaving
               it sitting on a member sign-in page as if it still had access. */
            var linked = session.user && session.user.user_metadata
              && session.user.user_metadata.payment_member_id;
            if (linked) FOB.supabase.auth.signOut();
          });
        }
        document.body.removeAttribute('data-fob-pending');
        return;
      }

      /* --- everything below needs a session ------------------ */
      if (!session) { toAuth(); return; }

      FOB.loadOwnProfile(session.user.id).then(function (profile) {
        if (!profile) {
          // The signup trigger should have made this row. If it
          // is missing, the account is in a broken half state.
          FOB.toast('Your profile could not be loaded. Sign in again.', 'error');
          FOB.supabase.auth.signOut().then(toAuth);
          return;
        }

        FOB.currentProfile = profile;

        if (mode === 'onboarding' && profile.onboarding_completed) {
          window.location.replace('/community/discussions.html');
          return;
        }
        if (mode === 'protected' && !profile.onboarding_completed) {
          window.location.replace('/community/onboarding.html');
          return;
        }

        document.body.removeAttribute('data-fob-pending');
        document.dispatchEvent(new CustomEvent('fob:ready', {
          detail: { session: session, profile: profile }
        }));
      }).catch(function (err) {
        var linked = session.user && session.user.user_metadata
          && session.user.user_metadata.payment_member_id;
        if (linked) {
          FOB.supabase.auth.signOut().then(function () {
            window.location.replace('/community/auth.html?locked=1');
          });
          return;
        }
        FOB.toast(FOB.friendlyError(err), 'error');
        document.body.removeAttribute('data-fob-pending');
      });
    });

    /* --- session expiry while the tab is open ---------------- */
    FOB.supabase.auth.onAuthStateChange(function (event) {
      if (event === 'SIGNED_OUT' && mode !== 'guest') {
        window.location.replace('/community/auth.html');
      }
    });
  });
})();
