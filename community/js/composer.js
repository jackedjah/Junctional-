/* ============================================================
   FOB COMMUNITY :: COMPOSER
   Creating a discussion. Text only in this pass. Media, GIFs and
   voice notes arrive in Phase E, so no control for them is shown.
   ============================================================ */
(function () {
  'use strict';

  var FOB = (window.FOB = window.FOB || {});
  var DRAFT_KEY = 'fob-community-draft';

  var els = {};
  var previewing = false;
  var trainingData = null;

  function saveDraft() {
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({
        title: els.title.value,
        body: els.body.value,
        category: els.category.value,
        at: Date.now()
      }));
    } catch (e) { /* private mode, storage full: not worth surfacing */ }
  }

  function loadDraft() {
    try {
      var raw = window.localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      var d = JSON.parse(raw);
      // Drop drafts older than a week.
      if (!d || (Date.now() - d.at) > 6048e5) { clearDraft(); return; }
      if (d.title) els.title.value = d.title;
      if (d.body) els.body.value = d.body;
      if (d.category) els.pendingCategory = d.category;
      if (d.title || d.body) {
        /* Note only. The composer stays collapsed until it is tapped:
           restoring a draft is not a reason to take over the screen. */
        els.draftNote.hidden = false;
      }
    } catch (e) { /* ignore */ }
  }

  function clearDraft() {
    try { window.localStorage.removeItem(DRAFT_KEY); } catch (e) {}
    els.draftNote.hidden = true;
  }

  /* The composer is the clearest place to say what this community is
     for, so the placeholder does the work instead of a banner. Each of
     these names a real thing a member can do here; a generic "what's on
     your mind" told nobody anything. One per visit rather than a timed
     carousel, so it never moves while somebody is reading it. */
  var PROMPTS = [
    "Share today's training.",
    'Ask the community.',
    'Show your progress.',
    'What did you discover today?',
    'Need help with movement?',
    'Working on a new experiment?',
    'Trying new equipment?',
    'Looking for a training partner?',
    'Share your latest session.',
    'Ask a question.'
  ];

  function rotatePrompt() {
    if (!els.prompt) return;
    /* Step through in order rather than at random, so a member sees a
       different one each visit instead of the same one twice by chance. */
    var seen = 0;
    try {
      seen = parseInt(window.localStorage.getItem('fob-prompt-index') || '0', 10) || 0;
      window.localStorage.setItem('fob-prompt-index', String((seen + 1) % PROMPTS.length));
    } catch (e) { seen = Math.floor(Math.random() * PROMPTS.length); }
    els.prompt.textContent = PROMPTS[seen % PROMPTS.length];
  }

  function expand() {
    els.full.hidden = false;
    els.collapsed.hidden = true;
    autosize();
  }

  function collapse() {
    els.full.hidden = true;
    els.collapsed.hidden = false;
  }

  function autosize() {
    els.body.style.height = 'auto';
    els.body.style.height = Math.min(els.body.scrollHeight, 460) + 'px';
  }

  function togglePreview() {
    previewing = !previewing;
    if (previewing) {
      els.preview.innerHTML = FOB.renderBody(els.body.value);
      els.preview.hidden = false;
      els.body.hidden = true;
      if (els.previewBtn) els.previewBtn.textContent = 'Edit';
    } else {
      els.preview.hidden = true;
      els.body.hidden = false;
      if (els.previewBtn) els.previewBtn.textContent = 'Preview';
      autosize();
    }
  }

  function validate() {
    var title = els.title.value.trim();
    var body = els.body.value.trim();
    /* Room and title are both optional now. A post with neither still
       has to say something, which is what the check below covers. */
    if (title.length > 160) return 'Titles are limited to 160 characters.';
    var hasMedia = window.FOB.composerMedia && FOB.composerMedia.count() > 0;
    if (!body && !hasMedia) return 'Write something, or add a photo, voice note or GIF.';
    if (body.length > 20000) return 'That post is too long. Limit is 20,000 characters.';
    return null;
  }

  function submit() {
    var problem = validate();
    if (problem) { FOB.setStatus(els.status, problem, 'error'); return; }

    els.submit.disabled = true;
    FOB.setStatus(els.status, 'Posting...', '');

    FOB.supabase.from('discussions').insert({
      author_id: FOB.currentProfile.id,
      /* Empty select means no room rather than an empty string, which
         the column would reject. */
      category_id: els.category.value || null,
      title: els.title.value.trim(),
      body: els.body.value.trim(),
      visibility: 'members'
    }).select('id, slug').single()
      .then(function (res) {
        if (res.error) throw res.error;
        var newId = res.data.id;

        var uploading = (window.FOB.composerMedia && FOB.composerMedia.count())
          ? (FOB.setStatus(els.status, 'Uploading attachments...', ''),
             FOB.composerMedia.attachAll(newId))
          : Promise.resolve({ ok: 0, failed: 0 });

        return uploading.then(function (result) {
          clearDraft();
          els.title.value = '';
          els.body.value = '';
          els.category.value = '';
          els.count.textContent = '';
          if (window.FOB.composerMedia) FOB.composerMedia.clear();
          if (previewing) togglePreview();
          collapse();
          FOB.setStatus(els.status, '', '');
          FOB.toast(result.failed
            ? 'Posted, but ' + result.failed + ' attachment' +
              (result.failed === 1 ? '' : 's') + ' did not upload.'
            : 'Posted.');
          els.submit.disabled = false;
          if (FOB.refreshFeedAfterPost) FOB.refreshFeedAfterPost(newId);
        });
      })
      .catch(function (err) {
        FOB.setStatus(els.status, FOB.friendlyError(err), 'error');
        els.submit.disabled = false;
      });
  }


  function appendToBody(text) {
    if (!text) return;
    var current = els.body.value.trim();
    els.body.value = current ? current + '\n\n' + text : text;
    autosize();
    saveDraft();
    els.body.dispatchEvent(new Event('input', { bubbles: true }));
    els.body.focus();
  }

  function loadTrainingData() {
    if (!els.trainingPanel) return;
    els.trainingPanel.hidden = false;
    els.trainingNote.textContent = 'Loading your recorded training...';
    els.shareLatest.disabled = true;
    els.shareProgress.disabled = true;

    FOB.supabase.auth.getSession().then(function (res) {
      var session = res && res.data && res.data.session;
      if (!session) throw new Error('Sign in to the Forum first.');
      return fetch('/.netlify/functions/community-training-data', {
        headers: { 'Authorization': 'Bearer ' + session.access_token }
      });
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) throw new Error(j.error || 'Training data could not be loaded.');
        return j;
      });
    }).then(function (j) {
      trainingData = j;
      els.shareLatest.disabled = !j.latest;
      els.shareProgress.disabled = !j.count;
      els.trainingNote.textContent = j.count
        ? j.count + ' recorded SESH' + (j.count === 1 ? '' : 'es') + ' available.'
        : 'No completed FOB SESHes are recorded yet.';
    }).catch(function (err) {
      trainingData = null;
      els.trainingNote.textContent = (err && err.message) || 'Training data could not be loaded right now.';
    });
  }

  var BADGES = [
    { key:'fobaby', name:'FOBABY', floor:0, label:'START' },
    { key:'fobalance', name:'FOBALANCE', floor:40, label:'40%+' },
    { key:'fobrilliant', name:'FOBRILLIANT', floor:60, label:'60%+' },
    { key:'fobeyond', name:'FOBEYOND', floor:80, label:'80%+' },
    { key:'fobeast', name:'FOBEAST', floor:95, label:'95%+' }
  ];

  function badgeForScore(score) {
    var n = Number(score) || 0, hit = BADGES[0];
    BADGES.forEach(function (b) { if (n >= b.floor) hit = b; });
    return hit;
  }

  function loadCardImage(src) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }

  function roundRect(ctx, x, y, w, h, r, fill, stroke) {
    var rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
  }

  function cardText(ctx, text, x, y, size, color, weight, align) {
    ctx.font = (weight || 500) + ' ' + size + 'px "Space Grotesk", Arial, sans-serif';
    ctx.fillStyle = color || '#F2EEE6';
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(String(text || ''), x, y);
  }

  function cardLabel(ctx, text, x, y, align) {
    ctx.font = '600 24px "Space Grotesk", Arial, sans-serif';
    ctx.fillStyle = '#D8BA83';
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    var spaced = String(text || '').toUpperCase().split('').join(' ');
    ctx.fillText(spaced, x, y);
  }

  function dateLabel(v) {
    if (!v) return '';
    var d = new Date(v);
    if (isNaN(d.getTime())) return String(v).slice(0,10);
    return d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
  }

  function toPng(canvas, name) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (!blob) return reject(new Error('The FOB data image could not be created.'));
        resolve({ blob:blob, name:name, width:canvas.width, height:canvas.height });
      }, 'image/png');
    });
  }

  function drawFooter(ctx, w, h) {
    ctx.strokeStyle = 'rgba(216,186,131,.28)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(70, h - 86); ctx.lineTo(w - 70, h - 86); ctx.stroke();
    cardLabel(ctx, 'ONE SYSTEM. ENDLESS APPLICATIONS.', 70, h - 40);
    cardLabel(ctx, 'FOB SYSTEMS', w - 70, h - 40, 'right');
  }

  function buildProgressCard(data) {
    var c = document.createElement('canvas'); c.width = 1080; c.height = 1350;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#05090D'; ctx.fillRect(0,0,c.width,c.height);
    var g = ctx.createRadialGradient(820,180,20,820,180,620);
    g.addColorStop(0,'rgba(216,186,131,.12)'); g.addColorStop(1,'rgba(5,9,13,0)');
    ctx.fillStyle = g; ctx.fillRect(0,0,c.width,c.height);

    cardLabel(ctx, 'FOB PROGRESS', 70, 92);
    cardText(ctx, (data.member && data.member.name) || 'FOB MEMBER', 70, 158, 54, '#F2EEE6', 600);
    cardText(ctx, 'CAREER BADGE', 70, 222, 26, '#D8BA83', 600);
    cardText(ctx, 'Highest FOBadge reached on a completed SESH.', 70, 260, 25, '#A4ABB4', 400);

    var best = data.best || data.latest || { score:0, badge:'FOBABY' };
    var earned = badgeForScore(best.score);
    var x0=70, gap=18, bw=170, by=320;
    var loads = BADGES.map(function (b) { return loadCardImage('/images/badges/'+b.key+'.png'); });
    return Promise.all(loads).then(function (imgs) {
      BADGES.forEach(function (b,i) {
        var x=x0+i*(bw+gap), selected=b.key===earned.key;
        if(selected) roundRect(ctx,x-8,by-18,bw+16,286,24,'rgba(216,186,131,.07)','rgba(216,186,131,.7)');
        ctx.save(); ctx.globalAlpha = selected ? 1 : .32;
        if(imgs[i]) ctx.drawImage(imgs[i],x,by,bw,bw);
        ctx.restore();
        cardText(ctx,b.name,x+bw/2,by+204,21,selected?'#E6C78D':'#777E87',600,'center');
        cardText(ctx,b.label,x+bw/2,by+238,18,selected?'#C7AA76':'#656B73',400,'center');
      });

      var statsY=650, sw=286, sg=28;
      [
        [String(best.score||0)+'%','PERSONAL BEST'],
        [String(data.count||0),'RECORDED SESH'+((data.count||0)===1?'':'ES')],
        [data.latest ? String(data.latest.score||0)+'%' : '—','MOST RECENT']
      ].forEach(function (a,i) {
        var x=70+i*(sw+sg); roundRect(ctx,x,statsY,sw,168,22,'#10151B','rgba(216,186,131,.18)');
        cardText(ctx,a[0],x+sw/2,statsY+74,52,'#E7C98F',600,'center');
        cardLabel(ctx,a[1],x+sw/2,statsY+126,'center');
      });

      var noteY=885;
      roundRect(ctx,70,noteY,940,275,24,'#11171D','rgba(216,186,131,.18)');
      cardText(ctx,earned.name,105,noteY+72,38,'#F2EEE6',600);
      cardText(ctx,'Career tier based on the best completed SESH score.',105,noteY+116,25,'#A4ABB4',400);
      cardText(ctx,'Personal best: '+(best.score||0)+'% · '+dateLabel(best.date),105,noteY+176,30,'#F2EEE6',500);
      if(data.latest) cardText(ctx,'Most recent: '+(data.latest.score||0)+'% · '+dateLabel(data.latest.date),105,noteY+222,28,'#C5C9CE',400);
      drawFooter(ctx,c.width,c.height);
      return toPng(c,'fob-progress.png');
    });
  }

  function buildLatestCard(data) {
    var row=data.latest;
    var c=document.createElement('canvas'); c.width=1080; c.height=1350;
    var ctx=c.getContext('2d'); ctx.fillStyle='#05090D'; ctx.fillRect(0,0,c.width,c.height);
    var g=ctx.createRadialGradient(850,220,20,850,220,650); g.addColorStop(0,'rgba(216,186,131,.13)'); g.addColorStop(1,'rgba(5,9,13,0)'); ctx.fillStyle=g; ctx.fillRect(0,0,c.width,c.height);
    cardLabel(ctx,'FOB SESH',70,92);
    cardText(ctx,(data.member&&data.member.name)||'FOB MEMBER',70,158,54,'#F2EEE6',600);
    cardText(ctx,dateLabel(row.date),70,204,26,'#A4ABB4',400);
    var badge=badgeForScore(row.score);
    return loadCardImage('/images/badges/'+badge.key+'.png').then(function(img){
      if(img) ctx.drawImage(img,650,92,320,320);
      cardText(ctx,String(row.score||0)+'%',70,360,122,'#E7C98F',600);
      cardText(ctx,badge.name,76,414,34,'#F2EEE6',600);
      roundRect(ctx,70,470,940,176,24,'#10151B','rgba(216,186,131,.18)');
      var rounds=(row.rounds_recorded==null?'—':row.rounds_recorded)+' / '+(row.rounds_total==null?'—':row.rounds_total);
      var setup=[]; if(row.block_lb!=null) setup.push(row.block_lb+' lb FOBlock'); if(row.band_level) setup.push(row.band_level+' FOBand');
      [['ROUNDS',rounds],['SETUP',setup.join(' · ')||'Recorded prescription']].forEach(function(a,i){
        var x=i?540:110; cardLabel(ctx,a[0],x,522); cardText(ctx,a[1],x,582,i?28:44,'#F2EEE6',600);
      });
      cardLabel(ctx,'BREAKDOWN BY CATEGORY',70,722);
      var cats=[['REACTIVE CORE',row.core_pct],['ISOMETRIC CONTROL',row.iso_pct],['PUSH / PULL',row.pp_pct],['MOVEMENT STYLES',row.tech_pct]];
      cats.forEach(function(a,i){
        var y=782+i*88; ctx.strokeStyle='rgba(216,186,131,.12)'; ctx.beginPath(); ctx.moveTo(70,y+50);ctx.lineTo(1010,y+50);ctx.stroke();
        cardText(ctx,a[0],70,y,30,'#F2EEE6',600); cardText(ctx,a[1]==null?'NOT RECORDED':Math.round(a[1])+'%',990,y,30,a[1]==null?'#707780':'#E7C98F',600,'right');
      });
      drawFooter(ctx,c.width,c.height); return toPng(c,'fob-latest-sesh.png');
    });
  }

  function attachTrainingCard(builder, defaultTitle) {
    if (!trainingData || !window.FOB.composerMedia || !FOB.composerMedia.addGeneratedImage) return;
    els.shareLatest.disabled = true; els.shareProgress.disabled = true;
    els.trainingNote.textContent = 'Building your FOB image...';
    builder(trainingData).then(function (out) {
      return FOB.composerMedia.addGeneratedImage(out.blob,out.name,out.width,out.height);
    }).then(function () {
      if (!els.title.value.trim()) els.title.value = defaultTitle;
      els.trainingPanel.hidden = true;
      els.trainingNote.textContent = '';
    }).catch(function (err) {
      els.trainingNote.textContent = (err && err.message) || 'The FOB image could not be created right now.';
      els.shareLatest.disabled = !trainingData.latest;
      els.shareProgress.disabled = !trainingData.count;
    });
  }

  function shareLatest() {
    if (!trainingData || !trainingData.latest) return;
    attachTrainingCard(buildLatestCard, 'Latest FOB SESH');
  }

  function shareProgress() {
    if (!trainingData || !trainingData.count) return;
    attachTrainingCard(buildProgressCard, 'My FOB Progress');
  }

  document.addEventListener('fob:ready', function () {
    els.collapsed = document.getElementById('composer-collapsed');
    els.prompt = document.getElementById('composer-prompt');
    rotatePrompt();
    els.full = document.getElementById('composer-full');
    els.title = document.getElementById('composer-title');
    els.body = document.getElementById('composer-body');
    els.category = document.getElementById('composer-category');
    els.preview = document.getElementById('composer-preview');
    els.previewBtn = document.getElementById('composer-preview-btn');
    els.submit = document.getElementById('composer-submit');
    els.cancel = document.getElementById('composer-cancel');
    els.status = document.getElementById('composer-status');
    els.draftNote = document.getElementById('composer-draft-note');
    els.count = document.getElementById('composer-count');
    els.trainingBtn = document.getElementById('composer-training');
    els.trainingPanel = document.getElementById('composer-training-share');
    els.trainingNote = document.getElementById('training-share-note');
    els.shareLatest = document.getElementById('share-latest-sesh');
    els.shareProgress = document.getElementById('share-progress');

    if (!els.full) return;

    els.collapsed.addEventListener('click', expand);
    els.collapsed.addEventListener('focus', expand);

    els.cancel.addEventListener('click', function () {
      if (els.title.value.trim() || els.body.value.trim()) {
        saveDraft();
        FOB.toast('Draft saved on this device.');
      }
      collapse();
    });

    if (els.previewBtn) els.previewBtn.addEventListener('click', togglePreview);
    els.submit.addEventListener('click', submit);

    if (els.trainingBtn) els.trainingBtn.addEventListener('click', loadTrainingData);
    if (els.shareLatest) els.shareLatest.addEventListener('click', shareLatest);
    if (els.shareProgress) els.shareProgress.addEventListener('click', shareProgress);

    els.body.addEventListener('input', function () {
      autosize();
      /* Silent until you are near the ceiling. A running count and a
         markdown legend on every keystroke is noise while writing. */
      var used = els.body.value.length;
      els.count.textContent = used > 18000
        ? used.toLocaleString() + ' / 20,000'
        : '';
      saveDraft();
    });
    els.title.addEventListener('input', saveDraft);
    els.category.addEventListener('change', saveDraft);

    loadDraft();

    // The category list loads asynchronously; restore the drafted
    // choice once the options actually exist.
    if (els.pendingCategory) {
      var tries = 0;
      var t = setInterval(function () {
        tries++;
        if (els.category.querySelector('option[value="' + els.pendingCategory + '"]')) {
          els.category.value = els.pendingCategory;
          clearInterval(t);
        } else if (tries > 40) {
          clearInterval(t);
        }
      }, 100);
    }
  });
})();
