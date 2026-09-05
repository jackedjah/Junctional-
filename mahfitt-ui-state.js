/* ══ MAHFITT :: SHARED UI STATE ═══════════════════════════════════════════
   One browser-owned source of truth for cross-route presentation preferences.
   Crown collapse and MAH MEDIA split are intentionally UI-only: neither owns audio, media data, or page data.
   R51: the R46 crown-shortcut preference is retired here (CROWN-003). */
(function(global){
  'use strict';
  var KEY='fob.mahfitt.ui.crownCollapsed.v1',MEDIA_SPLIT_KEY='fob.mahfitt.ui.mahMediaSplit.v1',listeners=[],mediaListeners=[];
  function read(){try{return global.localStorage.getItem(KEY)==='1'}catch(e){return false}}
  var collapsed=read();
  function clampMediaSplit(value){value=Number(value);return Number.isFinite(value)?Math.max(.36,Math.min(.94,value)):.5}
  function readMediaSplit(){try{return clampMediaSplit(global.localStorage.getItem(MEDIA_SPLIT_KEY)||.5)}catch(e){return .5}}
  var mediaSplit=readMediaSplit();
  function notify(source){
    var value=collapsed;
    listeners.slice().forEach(function(fn){try{fn(value,source||'local')}catch(e){}});
    try{global.dispatchEvent(new CustomEvent('mahfitt:crown-state',{detail:{collapsed:value,source:source||'local'}}))}catch(e){}
  }
  function getCrownCollapsed(){return collapsed}
  function setCrownCollapsed(value){
    value=!!value;
    var changed=value!==collapsed;collapsed=value;
    try{global.localStorage.setItem(KEY,value?'1':'0')}catch(e){}
    if(changed)notify('local');
    return collapsed;
  }
  function toggleCrownCollapsed(){return setCrownCollapsed(!collapsed)}
  function subscribe(fn){
    if(typeof fn!=='function')return function(){};
    listeners.push(fn);
    return function(){var i=listeners.indexOf(fn);if(i>=0)listeners.splice(i,1)};
  }
  /* R67 — MAH MEDIA divider presentation is a cross-route UI preference, so it
     lives beside crown collapse in this shared owner rather than inventing a
     page-local localStorage key in mygym.js. Values are the Photos share of the
     split pane: .50 is even, .94 is the video-collapsed end state. */
  function notifyMediaSplit(source){var value=mediaSplit;mediaListeners.slice().forEach(function(fn){try{fn(value,source||'local')}catch(e){}});try{global.dispatchEvent(new CustomEvent('mahfitt:media-split',{detail:{split:value,source:source||'local'}}))}catch(e){}}
  function getMediaSplit(){return mediaSplit}
  function setMediaSplit(value){value=clampMediaSplit(value);var changed=Math.abs(value-mediaSplit)>.0005;mediaSplit=value;try{global.localStorage.setItem(MEDIA_SPLIT_KEY,String(value))}catch(e){}if(changed)notifyMediaSplit('local');return mediaSplit}
  function subscribeMediaSplit(fn){if(typeof fn!=='function')return function(){};mediaListeners.push(fn);return function(){var i=mediaListeners.indexOf(fn);if(i>=0)mediaListeners.splice(i,1)}}
  /* R51 — CROWN-003 / SET-006. Crown Quick Access is RETIRED. The far-right
     crown destination is now a permanent MAHFITT AI entry owned by the crown
     renderer, so there is no preference to store, read, or synchronise. The
     obsolete key is cleared once on load as a safe backward-compatible
     migration: older builds wrote 'calendar' | 'progress' | 'meal-log' here
     and leaving it behind would strand dead state in every returning
     member's browser. No data of value is destroyed — the value only ever
     selected which of three already-reachable pages a button opened. */
  var LEGACY_SHORTCUT_KEY='fob.mahfitt.ui.crownShortcut.v1';
  function migrateRetiredCrownShortcut(){try{if(global.localStorage.getItem(LEGACY_SHORTCUT_KEY)!==null)global.localStorage.removeItem(LEGACY_SHORTCUT_KEY)}catch(e){}}
  migrateRetiredCrownShortcut();
  /* Keep one storage listener for both canonical preferences. This preserves
     the original collapse subscription contract while adding MAH MEDIA split
     persistence without duplicate global listeners. */
  global.addEventListener('storage',function(event){
    if(!event)return;
    if(event.key===KEY){
      var nextCollapsed=event.newValue==='1';
      if(nextCollapsed!==collapsed){collapsed=nextCollapsed;notify('storage')}
      return;
    }
    if(event.key===MEDIA_SPLIT_KEY){var nextSplit=clampMediaSplit(event.newValue||.5);if(Math.abs(nextSplit-mediaSplit)>.0005){mediaSplit=nextSplit;notifyMediaSplit('storage')}}
  });

  global.MAHFITT_UI_STATE=Object.freeze({key:KEY,getCrownCollapsed:getCrownCollapsed,setCrownCollapsed:setCrownCollapsed,toggleCrownCollapsed:toggleCrownCollapsed,subscribe:subscribe,mediaSplitKey:MEDIA_SPLIT_KEY,getMediaSplit:getMediaSplit,setMediaSplit:setMediaSplit,subscribeMediaSplit:subscribeMediaSplit,retiredShortcutKey:LEGACY_SHORTCUT_KEY});
})(window);
