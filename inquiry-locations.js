/* FOB SYSTEMS - training location configuration.
   Edit this file to add, remove, or disable locations without touching the form UI.
   Only locations with active:true AND gated:true are shown.
   Final location is always confirmed after contact. */
window.FOB_LOCATIONS = [
  {
    id: 'bk-mccarren-courts',
    name: 'McCarren Park Courts',
    borough: 'brooklyn',
    neighborhood: 'Williamsburg / Greenpoint',
    supportedSports: ['tennis', 'basketball', 'volleyball', 'pickleball'],
    gated: true,
    active: true,
    notes: 'Gated courts; early sessions preferred.'
  },
  {
    id: 'bk-mcgolrick-field',
    name: 'Msgr. McGolrick Park Field',
    borough: 'brooklyn',
    neighborhood: 'Greenpoint',
    supportedSports: [],
    gated: true,
    active: true,
    notes: 'Open field area inside gated park.'
  },
  {
    id: 'bk-fort-greene-courts',
    name: 'Fort Greene Park Courts',
    borough: 'brooklyn',
    neighborhood: 'Fort Greene',
    supportedSports: ['tennis', 'basketball'],
    gated: true,
    active: true,
    notes: ''
  },
  {
    id: 'bk-prospect-parade',
    name: 'Prospect Park Parade Ground',
    borough: 'brooklyn',
    neighborhood: 'Flatbush / Kensington',
    supportedSports: ['baseball', 'softball', 'lacrosse', 'volleyball'],
    gated: true,
    active: true,
    notes: 'Multiple gated fields; availability varies by season.'
  },
  {
    id: 'bk-sunset-courts',
    name: 'Sunset Park Courts',
    borough: 'brooklyn',
    neighborhood: 'Sunset Park',
    supportedSports: ['basketball', 'handball', 'tennis'],
    gated: true,
    active: true,
    notes: ''
  },
  {
    id: 'nm-highbridge',
    name: 'Highbridge Park Courts',
    borough: 'northern-manhattan',
    neighborhood: 'Washington Heights',
    supportedSports: ['basketball', 'handball'],
    gated: true,
    active: true,
    notes: 'Limited availability.'
  },
  {
    id: 'nm-inwood-hill-fields',
    name: 'Inwood Hill Park Fields',
    borough: 'northern-manhattan',
    neighborhood: 'Inwood',
    supportedSports: ['baseball', 'softball', 'lacrosse'],
    gated: true,
    active: true,
    notes: 'Limited availability.'
  },
  {
    id: 'nm-fort-tryon-lawn',
    name: 'Fort Tryon Park Lawn Area',
    borough: 'northern-manhattan',
    neighborhood: 'Hudson Heights',
    supportedSports: [],
    gated: false,
    active: true,
    notes: 'Not gated; kept for reference only.'
  }
];
