/* MR.MAH 3D :: INTERACTION
   Screen-to-3D. Horizontal pointer drag spins the subject.

   This is the Phase 1 interaction proof: a 2D gesture in CSS pixels has to
   arrive as a rotation in world space, survive a resize, and not fight the
   page around it.

   Behaviours carried over from the existing 2.5D drag (bindFabiCharacterDrag):
   pointer capture so the gesture survives leaving the element, one active
   pointer only, and touch-action:none on the canvas so a horizontal drag is
   not stolen by the page scroller.

   Momentum and snap-back are intentionally absent. The existing rig owns drag
   physics for the accepted design; duplicating a second, different feel here
   would create two competing answers to the same question before anyone has
   decided which one wins. */

export function createInteraction(options) {
  var opts = options || {};
  var element = opts.element;
  var onYaw = typeof opts.onYaw === 'function' ? opts.onYaw : function () {};
  var getYaw = typeof opts.getYaw === 'function' ? opts.getYaw : function () { return 0; };

  /* A full drag across the element's width turns the subject this far. Scaling
     by width rather than by raw pixels is what makes the gesture feel the same
     on a 375px phone and a 1024px iPad. */
  var SWEEP = Math.PI * 1.6;

  var active = null;    /* pointerId of the one gesture we track */
  var startX = 0;
  var startYaw = 0;
  var dragged = false;
  var bound = false;

  function width() {
    var r = element && element.getBoundingClientRect ? element.getBoundingClientRect() : null;
    return Math.max(1, (r && r.width) || 1);
  }

  function onPointerDown(e) {
    if (active !== null) return;                 /* ignore a second finger */
    if (e.button != null && e.button !== 0 && e.pointerType === 'mouse') return;
    active = e.pointerId;
    startX = e.clientX;
    startYaw = getYaw();
    dragged = false;
    try { element.setPointerCapture(e.pointerId); } catch (x) {}
    if (element.dataset) element.dataset.mrmahDragging = '1';
  }

  function onPointerMove(e) {
    if (active === null || e.pointerId !== active) return;
    var dx = e.clientX - startX;
    if (!dragged && Math.abs(dx) > 2) dragged = true;
    onYaw(startYaw + (dx / width()) * SWEEP);
    /* Only once the gesture is genuinely a drag: a stationary press must stay
       cancellable so it can still become a tap for a later phase. */
    if (dragged && e.cancelable) e.preventDefault();
  }

  function end(e) {
    if (active === null || (e && e.pointerId !== active)) return;
    try { element.releasePointerCapture(active); } catch (x) {}
    active = null;
    if (element.dataset) delete element.dataset.mrmahDragging;
  }

  function bind() {
    if (bound || !element) return false;
    element.addEventListener('pointerdown', onPointerDown);
    element.addEventListener('pointermove', onPointerMove, { passive: false });
    element.addEventListener('pointerup', end);
    element.addEventListener('pointercancel', end);
    /* A pointer released outside the window never fires pointerup on the
       element; without this the subject stays stuck to a pointer that is gone. */
    if (element.ownerDocument) element.ownerDocument.addEventListener('pointerup', end);
    bound = true;
    return true;
  }

  function dispose() {
    if (!bound || !element) return;
    element.removeEventListener('pointerdown', onPointerDown);
    element.removeEventListener('pointermove', onPointerMove);
    element.removeEventListener('pointerup', end);
    element.removeEventListener('pointercancel', end);
    if (element.ownerDocument) element.ownerDocument.removeEventListener('pointerup', end);
    if (element.dataset) delete element.dataset.mrmahDragging;
    active = null;
    bound = false;
  }

  bind();

  return {
    bind: bind,
    dispose: dispose,
    isDragging: function () { return active !== null; },
    sweep: SWEEP
  };
}
