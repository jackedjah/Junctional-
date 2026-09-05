/* ============================================================
   FOB COMMUNITY :: SOCIAL SHELL
   Feed tabs, Explore sheet, search toggle, bottom nav.
   Runs after community-feed.js so it can drive it.
   ============================================================ */
(function () {
  'use strict';

  var FOB = (window.FOB = window.FOB || {});

  document.addEventListener('fob:ready', function () {

    /* ---------- search toggle ------------------------------- */
    var searchWrap = document.getElementById('search-wrap');
    var searchInput = document.getElementById('feed-search');
    var openSearch = document.getElementById('open-search');
    var navSearch = document.getElementById('nav-search');

    function showSearch() {
      if (!searchWrap || !searchInput) return;
      searchWrap.hidden = false;
      if (openSearch) openSearch.setAttribute('aria-expanded', 'true');
      searchInput.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (openSearch && searchWrap && searchInput) openSearch.addEventListener('click', function () {
      searchWrap.hidden = !searchWrap.hidden;
      openSearch.setAttribute('aria-expanded', String(!searchWrap.hidden));
      if (!searchWrap.hidden) searchInput.focus();
    });

    if (navSearch) navSearch.addEventListener('click', showSearch);

    /* ---------- composer open/close ------------------------- */
    var composerBtn = document.getElementById('composer-collapsed');
    var navCreate = document.getElementById('nav-create');

    function openComposer() {
      var full = document.getElementById('composer-full');
      if (!full) return;
      full.hidden = false;
      composerBtn.hidden = true;
      var t = document.getElementById('composer-title');
      if (t) t.focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (navCreate) navCreate.addEventListener('click', openComposer);

    /* composer.js binds its own handler to #composer-collapsed;
       this only restores the button when it closes. */
    var cancel = document.getElementById('composer-cancel');
    if (cancel) cancel.addEventListener('click', function () {
      composerBtn.hidden = false;
    });

    /* ---------- feed tabs ----------------------------------- */
    var tabs = document.querySelectorAll('.fob-social-tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) { t.setAttribute('aria-selected', 'false'); });
        tab.setAttribute('aria-selected', 'true');
        if (FOB.setFeedMode) FOB.setFeedMode(tab.getAttribute('data-feed'));
      });
    });

    var navSaved = document.getElementById('nav-saved');
    if (navSaved) navSaved.addEventListener('click', function () {
      var savedTab = document.querySelector('.fob-social-tab[data-feed="saved"]');
      if (savedTab) savedTab.click();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    /* ---------- explore sheet -------------------------------- */
    var sheet = document.getElementById('explore-sheet');
    var openExplore = document.getElementById('open-explore');
    var lastFocus = null;

    function showSheet() {
      lastFocus = document.activeElement;
      sheet.hidden = false;
      document.body.style.overflow = 'hidden';
      var first = sheet.querySelector('button, [href]');
      if (first) first.focus();
    }
    function hideSheet() {
      sheet.hidden = true;
      document.body.style.overflow = '';
      if (lastFocus) lastFocus.focus();
    }

    if (openExplore) openExplore.addEventListener('click', showSheet);

    sheet.addEventListener('click', function (e) {
      if (e.target === sheet) hideSheet();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !sheet.hidden) hideSheet();
    });

    /* focus trap */
    sheet.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var items = sheet.querySelectorAll('button, [href], input, select');
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    });

    FOB.closeExplore = hideSheet;

    /* ---------- active filter chip --------------------------- */
    var clearBtn = document.getElementById('clear-filter');
    if (clearBtn) clearBtn.addEventListener('click', function () {
      if (FOB.selectCategory) FOB.selectCategory(null, null);
    });
  });
})();
