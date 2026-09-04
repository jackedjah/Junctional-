/* MR.MAH 3D :: SURFACES
   The adapter between what a PAGE knows and what the CHARACTER knows.

   AI Chat knows it is "generating a response". MAH Protocol knows it has
   "presented a question". Neither should have to decide what Mr.Mah's body
   does about it, and the renderer must never learn that either of those pages
   exists — that is what lets one character serve every surface.

   So the mapping lives here, as DATA, in one file. It is the only place in the
   package that mentions a MAHFITT page by name, and it mentions them only as
   keys in a table. Adding a surface later means adding a row; it never means
   touching states.js, the renderer, or the character.

   Usage from a page:

       const mah = createMrMahScene(el, { mode: 'chat' });
       mah.signal('chat', 'generating');    // -> thinking
       mah.signal('chat', 'response');      // -> explaining

   A page therefore only ever says what just happened to it. */

export var SURFACES = {
  /* AI CHAT ------------------------------------------------------------- */
  chat: {
    mode: 'chat',
    events: {
      idle: 'idle',
      waiting: 'listening',      /* composer focused, member is typing */
      generating: 'thinking',    /* request in flight */
      response: 'explaining',    /* the answer has appeared */
      settled: 'listening',      /* the answer has been read; back to attention */
      error: 'concerned'
    }
  },

  /* MAH PROTOCOL -------------------------------------------------------- */
  protocol: {
    mode: 'protocol',
    events: {
      intro: 'explaining',       /* the protocol is being introduced */
      question: 'explaining',    /* a question has been presented */
      answered: 'listening',     /* the member has chosen — acknowledge, then wait */
      generating: 'thinking',    /* the program is being calculated */
      complete: 'success',       /* the program is ready */
      concern: 'concerned'
    }
  },

  /* Any quiet surface that just wants him present — a Home card, a coach
     avatar. Named so those surfaces do not invent their own vocabulary. */
  ambient: {
    mode: 'portrait',
    events: { idle: 'idle', greet: 'explaining', attention: 'listening' }
  }
};

export var SURFACE_NAMES = Object.keys(SURFACES);

/* Resolve a page event to a character state. Returns null for anything the
   surface does not define, so an unknown event is a no-op rather than a throw
   — a page mid-refactor must never be able to break the character. */
export function resolve(surface, event) {
  var s = SURFACES[surface];
  if (!s) return null;
  var state = s.events[event];
  return state || null;
}

export function modeFor(surface) {
  var s = SURFACES[surface];
  return s ? s.mode : null;
}
