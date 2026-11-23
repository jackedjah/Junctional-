/* Lets the unchanged MAHFITT progression file (CommonJS) load in a browser.
   progression.js assigns module.exports; workout-core.js picks it up and removes these globals. */
'use strict';
window.module = { exports: {} };
window.exports = window.module.exports;
