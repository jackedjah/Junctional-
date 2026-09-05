/* ULTRA-MAHFITT JOB III — one qualified page-history swipe primitive.
   History ownership stays with the app/router. This module only decides when a
   pointer gesture is unambiguously page navigation and protects existing
   horizontal/interactive controls. */
(function(global){
  'use strict';
  var DEFAULT_PROTECTED='input,textarea,select,option,button,a,[role="button"],[contenteditable="true"],[data-a],[data-mg],[data-retro],[data-cal-rate],[data-cal-pitch],[data-cal-seek],.fobtempo__rail,.fobpitch__rail,.mah-songseek,.mah-volume,.workout-controlrow,.workout-prog,.workout-progwrap,.workout-fobeam,.gym-motion-divider,.exlane,#exLane,.dots,.dot,.setwrap,.sets,.cal-gridwrap,.mg-entry-row,.mg-message-action-viewport,.studio-tempo,.studio-eq,.studio-drawer__grip';
  function standalone(){try{return !!(global.navigator&&global.navigator.standalone)||(global.matchMedia&&global.matchMedia('(display-mode: standalone)').matches)}catch(e){return false}}
  function closest(target,selector){try{return target&&target.closest&&target.closest(selector)}catch(e){return null}}
  function isProtected(target,extra){return !!closest(target,DEFAULT_PROTECTED+(extra?(','+extra):''))}
  function qualifies(dx,dy,ms,opt){opt=opt||{};var ax=Math.abs(Number(dx)||0),ay=Math.abs(Number(dy)||0),duration=Math.max(1,Number(ms)||1),min=Number(opt.minDistance)||58,fast=Number(opt.fastDistance)||34,velocity=Number(opt.velocity)||.48,dominance=Number(opt.dominance)||1.38;if(ax<min&&!(ax>=fast&&ax/duration>=velocity))return false;if(ax<ay*dominance)return false;if(ay>Math.max(72,ax*.64))return false;return true}
  function bind(target,callback,options){
    target=target||global.document;options=options||{};if(!target||!target.addEventListener||typeof callback!=='function')return function(){};
    var drag=null,locked=false;
    function validStart(e){
      if(locked)return false;if(e.pointerType==='mouse'&&e.button!==0)return false;
      if(isProtected(e.target,options.protectedSelector))return false;
      if(typeof options.guard==='function'&&!options.guard(e))return false;
      var width=global.innerWidth||global.document&&global.document.documentElement&&global.document.documentElement.clientWidth||0;
      var edge=Number(options.browserEdgeGuard)||26;
      if(!standalone()&&width&&edge>0&&(e.clientX<=edge||e.clientX>=width-edge))return false;
      return true;
    }
    function down(e){if(!validStart(e))return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,dx:0,dy:0,t:(global.performance&&performance.now?performance.now():Date.now()),axis:''}}
    function move(e){if(!drag||e.pointerId!==drag.id)return;drag.dx=e.clientX-drag.x;drag.dy=e.clientY-drag.y;if(!drag.axis&&(Math.abs(drag.dx)>7||Math.abs(drag.dy)>7))drag.axis=Math.abs(drag.dx)>Math.abs(drag.dy)*1.2?'x':'y';if(drag.axis==='x'&&Math.abs(drag.dx)>18&&e.cancelable)e.preventDefault()}
    function end(e){if(!drag||e.pointerId!==drag.id)return;var d=drag;drag=null;if(d.axis&&d.axis!=='x')return;var now=(global.performance&&performance.now?performance.now():Date.now());if(!qualifies(d.dx,d.dy,now-d.t,options))return;locked=true;try{callback(d.dx>0?'back':'forward',d,e)}finally{global.setTimeout(function(){locked=false},Number(options.lockMs)||280)}}
    function cancel(e){if(!drag||!e||e.pointerId===drag.id)drag=null}
    target.addEventListener('pointerdown',down,{passive:true,capture:true});
    target.addEventListener('pointermove',move,{passive:false,capture:true});
    target.addEventListener('pointerup',end,{passive:true,capture:true});
    target.addEventListener('pointercancel',cancel,{passive:true,capture:true});
    return function(){target.removeEventListener('pointerdown',down,true);target.removeEventListener('pointermove',move,true);target.removeEventListener('pointerup',end,true);target.removeEventListener('pointercancel',cancel,true)};
  }
  global.MAHFITT_NAV_GESTURE=Object.freeze({bind:bind,qualifies:qualifies,isProtected:isProtected,isStandalone:standalone,protectedSelector:DEFAULT_PROTECTED});
})(window);
