/* ---------------------------------------------------------------
   BOOKING + MAP CONFIG

   Browser-safe values only.

   The MapTiler key is necessarily public: the map loads tiles from
   the browser, so the key travels with every request. That is normal
   and expected for a tile key, but it is NOT a secret and must be
   RESTRICTED BY ORIGIN in the MapTiler dashboard so it only works on
   fob.systems. Without that restriction anybody can lift it and spend
   your tile quota.

   Nothing here grants write access to anything. Availability rules and
   bookings are read only through the server, never from the browser.
   --------------------------------------------------------------- */
window.FOB_BOOKING_CONFIG = {
  MAPTILER_KEY: 'yupdclpMi4Gu2aV9EB0b',
  MAP_STYLE_URL: 'https://api.maptiler.com/maps/019faea0-c490-75e8-ab8b-3cee164bcf38/style.json?key=yupdclpMi4Gu2aV9EB0b',

  /* Brooklyn-first framing. The camera reframes to fit every approved
     park on open, so these are only the starting values before that
     first fit happens. */
  /* Williamsburg. The map rests here rather than fitting all 469 parks,
     which would zoom out far enough that nothing is legible. */
  DEFAULT_CENTER: [-73.9536, 40.7143],   /* Williamsburg, [lng, lat] */
  DEFAULT_ZOOM: 13.4,
  MIN_ZOOM: 10,
  MAX_ZOOM: 18,

  TIMEZONE: 'America/New_York'
};
