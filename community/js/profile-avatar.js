/* ---------------------------------------------------------------
   PROFILE PHOTO :: change it from the account page

   Uses the shared drag-and-zoom editor before upload, then keeps the
   same bucket, path shape, and storage rules as onboarding.
   --------------------------------------------------------------- */
(function () {
  var SIZE = 512;

  document.addEventListener('fob:ready', function (e) {
    var profile = e.detail && e.detail.profile;
    if (!profile) return;

    var pick = document.getElementById('avatar-change');
    var input = document.getElementById('avatar-change-file');
    var note = document.getElementById('avatar-change-note');
    var host = document.getElementById('home-avatar-host');
    if (!pick || !input || !note || !host) return;

    pick.addEventListener('click', function () { input.click(); });

    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      input.value = '';
      if (!file) return;

      var check = window.FOB.validateAvatarFile(file);
      if (!check.ok) return say(check.reason, 'is-error');

      say('Preparing your photo...', '');
      pick.disabled = true;

      editSquare(file)
        .then(function (blob) { return upload(blob, profile.id); })
        .then(function (path) { return save(path, profile.id); })
        .then(function (path) {
          profile.avatar_path = path;
          paint(path);
          say('Photo updated.', 'is-ok');
        })
        .catch(function (err) {
          if (err && err.cancelled) return;
          say(window.FOB.friendlyError(err), 'is-error');
        })
        .finally(function () { pick.disabled = false; });
    });

    function say(text, cls) {
      note.textContent = text;
      note.className = 'fob-community-field-note ' + (cls || '');
    }

    function paint(path) {
      var url = window.FOB.avatarUrl(path);
      if (!url) return;
      host.innerHTML = '';
      var img = document.createElement('img');
      img.className = 'fob-profile-avatar';
      /* Storage keeps the same public URL shape, so a browser that
         cached the old file would keep showing it. */
      img.src = url + (url.indexOf('?') === -1 ? '?' : '&') + 'v=' + Date.now();
      img.alt = '';
      host.appendChild(img);
    }
  });

  /* Account changes now use the same visible drag-and-zoom crop step as the
     app profile and album covers. Keep the old centre crop only as a safe
     fallback for a browser that failed to load the shared editor. */
  function editSquare(file) {
    if (window.FOBImageCrop && window.FOBImageCrop.open) {
      return window.FOBImageCrop.open(file, {
        title: 'Fit forum profile photo', size: SIZE, quality: 0.9
      });
    }
    return squareFrom(file);
  }

  /* Centre square, scaled to 512, exported as JPEG fallback. */
  function squareFrom(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('Could not read that file.')); };
      reader.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error('That image could not be opened.')); };
        img.onload = function () {
          var side = Math.min(img.width, img.height);
          var canvas = document.createElement('canvas');
          canvas.width = canvas.height = SIZE;
          canvas.getContext('2d').drawImage(
            img,
            (img.width - side) / 2, (img.height - side) / 2, side, side,
            0, 0, SIZE, SIZE
          );
          canvas.toBlob(function (blob) {
            if (blob) resolve(blob);
            else reject(new Error('That image could not be processed.'));
          }, 'image/jpeg', 0.9);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function upload(blob, userId) {
    var path = userId + '/avatar-' + Date.now() + '.jpg';
    return window.FOB.supabase.storage.from('avatars')
      .upload(path, blob, { contentType: 'image/jpeg', upsert: true })
      .then(function (res) {
        if (res.error) throw res.error;
        return path;
      });
  }

  function save(path, userId) {
    return window.FOB.supabase.from('profiles')
      .update({ avatar_path: path }).eq('id', userId)
      .then(function (res) {
        if (res.error) throw res.error;
        return path;
      });
  }
})();
