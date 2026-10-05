// Observatoires (comme l'ISS : un bouton pour s'y rendre et une « vue depuis » l'observatoire, où l'on regarde le ciel et l'horizon en glissant).
// Position : latitude / longitude en degrés, altitude du sol en mètres ; `eyeM` = hauteur de la caméra au-dessus du sol (la caméra reste au-dessus du maillage du relief, dont les facettes font ≈ 75 m).
// Valeurs de MÉMOIRE (à vérifier) : Pic du Midi de Bigorre 42,9369° N, 0,1426° E, 2 877 m.
export const OBSERVATORIES = [
  {
    id: 'pic-du-midi',
    name: 'Observatoire du Pic du Midi',
    short: 'Pic du Midi',
    kind: 'Observatoire astronomique de montagne',
    lat: 42.9369, lon: 0.1426, altM: 2877, eyeM: 120,
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
