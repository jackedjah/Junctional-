/* ---------------------------------------------------------------
   EDIT PROFILE

   Onboarding collects a display name, a bio and interests once and
   then never offers them again, so anything a member typed on day
   one was permanent. This puts the same three fields on the account
   page using the same vocabulary and the same grouped chip picker,
   so the two screens cannot drift apart.

   Interests are stored in the user_interests join table. Saving
   deletes the rows the member unticked and inserts the new ones
   rather than clearing and rewriting the set, so a failed save
   cannot leave someone with no interests at all.
   --------------------------------------------------------------- */
(function () {
  var state = {
    userId: null,
    all: [],        // every interest row
    selected: [],   // interest ids currently ticked
    original: []    // what was ticked when the page loaded
  };

  document.addEventListener('fob:ready', function (e) {
    var profile = e.detail && e.detail.profile;
    if (!profile) return;
    if (!document.getElementById('edit-interests')) return;

    state.userId = profile.id;

    var name = document.getElementById('edit-display-name');
    var bio = document.getElementById('edit-bio');
    /* Every field the profile sheet can display is editable here, so
       nothing is collected once at onboarding and then frozen. */
    var extra = {
      pronouns:         document.getElementById('edit-pronouns'),
      experience_level: document.getElementById('edit-experience'),
      current_city:     document.getElementById('edit-city'),
      hometown:         document.getElementById('edit-hometown'),
      training_goals:   document.getElementById('edit-goals'),
      fob_experience:   document.getElementById('edit-fob'),
      website_url:      document.getElementById('edit-website')
    };

    /* Colour inputs always hold a value, so "off" needs its own state
       rather than being inferred from the swatch. */
    var glow = document.getElementById('edit-glow');
    var glowDot = document.getElementById('edit-glow-dot');
    var glowOff = document.getElementById('edit-glow-off');
    var glowOn = false;

    function paintGlow() {
      if (!glowDot) return;
      glowDot.style.background = glowOn ? glow.value : 'transparent';
      glowDot.style.boxShadow = glowOn ? '0 0 10px 2px ' + glow.value : 'none';
    }
    if (glow) {
      glow.addEventListener('input', function () { glowOn = true; paintGlow(); });
    }
    if (glowOff) {
      glowOff.addEventListener('click', function () { glowOn = false; paintGlow(); });
    }
    var count = document.getElementById('edit-bio-count');
    var save = document.getElementById('edit-save');
    var status = document.getElementById('edit-status');

    name.value = profile.display_name || '';
    bio.value = profile.bio || '';
    updateCount();
    loadExtra();

    /* These are not on the session profile, so read them once. */
    function loadExtra() {
      window.FOB.supabase.from('profiles')
        .select('pronouns, experience_level, current_city, hometown, training_goals, fob_experience, website_url, story_glow')
        .eq('id', state.userId).maybeSingle()
        .then(function (res) {
          if (res.error || !res.data) return;
          Object.keys(extra).forEach(function (k) {
            if (extra[k]) extra[k].value = res.data[k] || '';
          });
          if (glow && res.data.story_glow) {
            glow.value = res.data.story_glow;
            glowOn = true;
            paintGlow();
          }
        })
        .catch(function () { /* the fields simply start empty */ });
    }

    bio.addEventListener('input', updateCount);
    function updateCount() {
      count.textContent = bio.value.length + ' / 500';
    }

    load().then(render).catch(function () {
      document.getElementById('edit-interests').textContent =
        'Could not load the interest list.';
    });

    save.addEventListener('click', function () {
      var displayName = name.value.trim();
      if (!displayName) {
        return window.FOB.setStatus(status, 'Add a display name.', 'error');
      }
      if (!state.selected.length) {
        return window.FOB.setStatus(status, 'Choose at least one interest.', 'error');
      }

      save.disabled = true;
      window.FOB.setStatus(status, 'Saving...', '');

      var patch = { display_name: displayName, bio: bio.value.trim() || null };
      Object.keys(extra).forEach(function (k) {
        if (!extra[k]) return;
        patch[k] = extra[k].value.trim() || null;
      });
      if (glow) patch.story_glow = glowOn ? glow.value : null;

      window.FOB.supabase.from('profiles')
        .update(patch)
        .eq('id', state.userId)
        .then(function (res) {
          if (res.error) throw res.error;
          return syncInterests();
        })
        .then(function () {
          state.original = state.selected.slice();
          profile.display_name = displayName;
          profile.bio = bio.value.trim() || null;
          var heading = document.getElementById('home-name');
          if (heading) heading.textContent = displayName;
          window.FOB.setStatus(status, 'Saved.', 'ok');
        })
        .catch(function (err) {
          window.FOB.setStatus(status, window.FOB.friendlyError(err), 'error');
        })
        .finally(function () { save.disabled = false; });
    });
  });

  function load() {
    return Promise.all([
      window.FOB.supabase.from('interests')
        .select('id, name, grouping').eq('is_approved', true).order('sort_order'),
      window.FOB.supabase.from('user_interests')
        .select('interest_id').eq('user_id', state.userId)
    ]).then(function (res) {
      if (res[0].error) throw res[0].error;
      if (res[1].error) throw res[1].error;
      state.all = res[0].data || [];
      state.selected = (res[1].data || []).map(function (r) { return r.interest_id; });
      state.original = state.selected.slice();
    });
  }

  function render() {
    var host = document.getElementById('edit-interests');
    window.FOB.renderGroupedChips(host, state.all, function (label, id) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'fob-community-chip';
      btn.textContent = label;
      var on = state.selected.indexOf(id) !== -1;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.addEventListener('click', function () {
        var at = state.selected.indexOf(id);
        if (at === -1) { state.selected.push(id); btn.setAttribute('aria-pressed', 'true'); }
        else { state.selected.splice(at, 1); btn.setAttribute('aria-pressed', 'false'); }
      });
      return btn;
    });
  }

  /* Only touch what actually changed. */
  function syncInterests() {
    var added = state.selected.filter(function (id) {
      return state.original.indexOf(id) === -1;
    });
    var removed = state.original.filter(function (id) {
      return state.selected.indexOf(id) === -1;
    });

    var work = [];

    if (removed.length) {
      work.push(
        window.FOB.supabase.from('user_interests')
          .delete().eq('user_id', state.userId).in('interest_id', removed)
      );
    }
    if (added.length) {
      work.push(
        window.FOB.supabase.from('user_interests')
          .upsert(added.map(function (id) {
            return { user_id: state.userId, interest_id: id };
          }), { onConflict: 'user_id,interest_id' })
      );
    }
    if (!work.length) return Promise.resolve();

    return Promise.all(work).then(function (results) {
      results.forEach(function (r) { if (r.error) throw r.error; });
    });
  }
})();
