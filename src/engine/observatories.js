// Observatoires (comme l'ISS : un bouton pour s'y rendre et une « vue depuis » l'observatoire, où l'on regarde le ciel et l'horizon en glissant).
// Position : latitude / longitude en degrés, altitude du sol en mètres ; `eyeM` = hauteur de la caméra au-dessus du sol (la caméra reste au-dessus du maillage du relief, dont les facettes font ≈ 75 m).
// Valeurs de MÉMOIRE (à vérifier) : positions, altitudes et faits de tous les sites. `scene` = décor de l'illustration de la fiche (snow | desert | forest).
export const OBSERVATORIES = [
  {
    id: 'pic-du-midi',
    name: 'Observatoire du Pic du Midi',
    short: 'Pic du Midi',
    kind: 'Observatoire astronomique de montagne',
    lat: 42.9369, lon: 0.1426, altM: 2877, eyeM: 120,
    scene: 'snow',
    image: 'data/observatories/pic-du-midi.png',
    facts: [
      { label: 'Lieu', value: 'Pic du Midi de Bigorre, Hautes-Pyrénées (France)' },
      { label: 'Altitude', value: '2 877 m' },
      { label: 'Observatoire', value: 'depuis 1878' },
      { label: 'Grand télescope', value: 'Bernard Lyot, 2 m (1980)' },
      { label: 'Ciel', value: 'réserve internationale de ciel étoilé (2013)' },
    ],
    note: 'Faits écrits de mémoire : à vérifier.',
  },
  {
    id: 'mauna-kea',
    name: 'Observatoires du Mauna Kea',
    short: 'Mauna Kea',
    kind: 'Observatoires astronomiques de volcan',
    lat: 19.8207, lon: -155.4681, altM: 4205, eyeM: 120,
    scene: 'snow',
    image: 'data/observatories/mauna-kea.png',
    facts: [
      { label: 'Lieu', value: 'Hawaï (États-Unis)' },
      { label: 'Altitude', value: 'vers 4 200 m' },
      { label: 'Observatoire', value: 'depuis 1964' },
      { label: 'À retenir', value: 'Keck 2 × 10 m, Subaru 8,2 m, Gemini Nord' },
      { label: 'Particularité', value: 'au-dessus d’une grande partie de l’atmosphère' },
    ],
    note: 'Position et faits écrits de mémoire : à vérifier.',
  },
  {
    id: 'paranal',
    name: 'Observatoire du Paranal (VLT)',
    short: 'Paranal',
    kind: 'Observatoire astronomique de désert (ESO)',
    lat: -24.6275, lon: -70.4044, altM: 2635, eyeM: 120,
    scene: 'desert',
    image: 'data/observatories/paranal.png',
    facts: [
      { label: 'Lieu', value: 'désert d’Atacama (Chili)' },
      { label: 'Altitude', value: '2 635 m' },
      { label: 'Observatoire', value: 'depuis 1999' },
      { label: 'À retenir', value: 'Very Large Telescope : 4 télescopes de 8,2 m' },
      { label: 'Particularité', value: 'l’un des ciels les plus secs et les plus noirs' },
    ],
    note: 'Position et faits écrits de mémoire : à vérifier.',
  },
  {
    id: 'alma',
    name: 'ALMA (plateau de Chajnantor)',
    short: 'ALMA',
    kind: 'Radiotélescope (réseau d’antennes)',
    lat: -23.0193, lon: -67.7532, altM: 5058, eyeM: 120,
    scene: 'desert',
    image: 'data/observatories/alma.png',
    facts: [
      { label: 'Lieu', value: 'désert d’Atacama (Chili)' },
      { label: 'Altitude', value: '5 058 m' },
      { label: 'Observatoire', value: 'depuis 2013' },
      { label: 'À retenir', value: '66 antennes (ondes millimétriques)' },
      { label: 'Particularité', value: 'l’un des sites d’observation les plus hauts du monde' },
    ],
    note: 'Position et faits écrits de mémoire : à vérifier.',
  },
  {
    id: 'la-silla',
    name: 'Observatoire de La Silla',
    short: 'La Silla',
    kind: 'Observatoire astronomique de désert (ESO)',
    lat: -29.2563, lon: -70.738, altM: 2400, eyeM: 120,
    scene: 'desert',
    image: 'data/observatories/la-silla.png',
    facts: [
      { label: 'Lieu', value: 'Chili' },
      { label: 'Altitude', value: '2 400 m' },
      { label: 'Observatoire', value: 'depuis 1969' },
      { label: 'À retenir', value: 'télescope de 3,6 m (recherche d’exoplanètes)' },
      { label: 'Particularité', value: 'premier observatoire de l’ESO au Chili' },
    ],
    note: 'Position et faits écrits de mémoire : à vérifier.',
  },
  {
    id: 'la-palma',
    name: 'Observatoire du Roque de los Muchachos',
    short: 'La Palma',
    kind: 'Observatoire astronomique de volcan',
    lat: 28.7606, lon: -17.8816, altM: 2396, eyeM: 120,
    scene: 'forest',
    image: 'data/observatories/la-palma.png',
    facts: [
      { label: 'Lieu', value: 'île de La Palma, Canaries (Espagne)' },
      { label: 'Altitude', value: '2 396 m' },
      { label: 'Observatoire', value: 'depuis 1985' },
      { label: 'À retenir', value: 'Grand Télescope des Canaries 10,4 m' },
      { label: 'Particularité', value: 'au-dessus de la mer de nuages' },
    ],
    note: 'Position et faits écrits de mémoire : à vérifier.',
  },
  {
    id: 'kitt-peak',
    name: 'Observatoire national de Kitt Peak',
    short: 'Kitt Peak',
    kind: 'Observatoire astronomique de désert',
    lat: 31.9583, lon: -111.5967, altM: 2096, eyeM: 120,
    scene: 'desert',
    image: 'data/observatories/kitt-peak.png',
    facts: [
      { label: 'Lieu', value: 'Arizona (États-Unis)' },
      { label: 'Altitude', value: '2 096 m' },
      { label: 'Observatoire', value: 'depuis 1958' },
      { label: 'À retenir', value: 'télescope Mayall de 4 m' },
      { label: 'Particularité', value: 'l’un des plus grands parcs de télescopes au monde' },
    ],
    note: 'Position et faits écrits de mémoire : à vérifier.',
  },
  {
    id: 'palomar',
    name: 'Observatoire du Mont Palomar',
    short: 'Palomar',
    kind: 'Observatoire astronomique de montagne',
    lat: 33.3564, lon: -116.865, altM: 1712, eyeM: 120,
    scene: 'forest',
    image: 'data/observatories/palomar.png',
    facts: [
      { label: 'Lieu', value: 'Californie (États-Unis)' },
      { label: 'Altitude', value: '1 712 m' },
      { label: 'Observatoire', value: 'depuis 1948' },
      { label: 'À retenir', value: 'télescope Hale de 5 m' },
      { label: 'Particularité', value: 'plus grand télescope du monde de 1948 à 1975' },
    ],
    note: 'Position et faits écrits de mémoire : à vérifier.',
  },
  {
    id: 'mount-wilson',
    name: 'Observatoire du Mont Wilson',
    short: 'Mont Wilson',
    kind: 'Observatoire astronomique de montagne',
    lat: 34.2258, lon: -118.0572, altM: 1742, eyeM: 120,
    scene: 'forest',
    image: 'data/observatories/mount-wilson.png',
    facts: [
      { label: 'Lieu', value: 'Californie (États-Unis)' },
      { label: 'Altitude', value: '1 742 m' },
      { label: 'Observatoire', value: 'depuis 1904' },
      { label: 'À retenir', value: 'télescope Hooker de 2,5 m' },
      { label: 'Particularité', value: 'Hubble y a mesuré l’expansion de l’Univers' },
    ],
    note: 'Position et faits écrits de mémoire : à vérifier.',
  },
  {
    id: 'siding-spring',
    name: 'Observatoire de Siding Spring',
    short: 'Siding Spring',
    kind: 'Observatoire astronomique de montagne',
    lat: -31.2733, lon: 149.0644, altM: 1165, eyeM: 120,
    scene: 'desert',
    image: 'data/observatories/siding-spring.png',
    facts: [
      { label: 'Lieu', value: 'Nouvelle-Galles du Sud (Australie)' },
      { label: 'Altitude', value: '1 165 m' },
      { label: 'Observatoire', value: 'depuis 1965' },
      { label: 'À retenir', value: 'Télescope anglo-australien de 3,9 m' },
      { label: 'Particularité', value: 'ciel de l’hémisphère sud' },
    ],
    note: 'Position et faits écrits de mémoire : à vérifier.',
  },
  {
    id: 'sutherland',
    name: 'Observatoire astronomique d’Afrique du Sud',
    short: 'Sutherland',
    kind: 'Observatoire astronomique de désert',
    lat: -32.3783, lon: 20.8105, altM: 1798, eyeM: 120,
    scene: 'desert',
    image: 'data/observatories/sutherland.png',
    facts: [
      { label: 'Lieu', value: 'Karoo (Afrique du Sud)' },
      { label: 'Altitude', value: '1 798 m' },
      { label: 'Observatoire', value: 'depuis 1972' },
      { label: 'À retenir', value: 'Grand Télescope d’Afrique australe 10 m' },
      { label: 'Particularité', value: 'ciel très sombre du Karoo' },
    ],
    note: 'Position et faits écrits de mémoire : à vérifier.',
  },
  {
    id: 'haute-provence',
    name: 'Observatoire de Haute-Provence',
    short: 'Haute-Provence',
    kind: 'Observatoire astronomique',
    lat: 43.9314, lon: 5.7133, altM: 650, eyeM: 120,
    scene: 'forest',
    image: 'data/observatories/haute-provence.png',
    facts: [
      { label: 'Lieu', value: 'Alpes-de-Haute-Provence (France)' },
      { label: 'Altitude', value: '650 m' },
      { label: 'Observatoire', value: 'depuis 1937' },
      { label: 'À retenir', value: 'première exoplanète autour d’une étoile comme le Soleil (1995)' },
      { label: 'Particularité', value: 'découverte de 51 Pegasi b' },
    ],
    note: 'Position et faits écrits de mémoire : à vérifier.',
  },
  {
    id: 'greenwich',
    name: 'Observatoire royal de Greenwich',
    short: 'Greenwich',
    kind: 'Observatoire historique',
    lat: 51.4769, lon: -0.0005, altM: 46, eyeM: 120,
    scene: 'forest',
    image: 'data/observatories/greenwich.png',
    facts: [
      { label: 'Lieu', value: 'Londres (Royaume-Uni)' },
      { label: 'Altitude', value: '46 m' },
      { label: 'Observatoire', value: 'depuis 1675' },
      { label: 'À retenir', value: 'méridien de Greenwich (longitude 0°)' },
      { label: 'Particularité', value: 'origine des longitudes depuis 1884' },
    ],
    note: 'Position et faits écrits de mémoire : à vérifier.',
  },
];

export const observatoryById = id => OBSERVATORIES.find(o => o.id === id) || null;
export const OBS_VIEW_ALT_KM = 40;      // la vue d'accès : à 40 km d'altitude à la verticale de l'observatoire (la boule, de près)
export const OBS_VIEW_PITCH = 6;        // la vue « depuis » commence 6° au-dessus de l'horizon, plein sud
export const OBS_VIEW_FOV = 70;

// position de l'œil de l'observateur (rayons terrestres), et vecteurs locaux (tableaux [x, y, z], repère de la scène : y = nord, x vers (lon 0, lat 0), z vers 90° O)
export function observatoryFrame(o, R_M = 6378137) {
  const lat = o.lat * Math.PI / 180, lon = o.lon * Math.PI / 180;
  const up = [Math.cos(lat) * Math.cos(lon), Math.sin(lat), -Math.cos(lat) * Math.sin(lon)];
  const east = [-Math.sin(lon) * 0 + 0, 0, 0];
  // est = dérivée de ll() par rapport à la longitude : (−cos lat sin lon, 0, −cos lat cos lon) normalisée
  east[0] = -Math.sin(lon); east[1] = 0; east[2] = -Math.cos(lon);
  const north = [up[1] * east[2] - up[2] * east[1], up[2] * east[0] - up[0] * east[2], up[0] * east[1] - up[1] * east[0]];   // up × east
  const r = 1 + (o.altM + o.eyeM) / R_M;
  return { up, east, north, south: north.map(v => -v), eye: up.map(v => v * r), ground: up.map(v => v * (1 + o.altM / R_M)) };
}
