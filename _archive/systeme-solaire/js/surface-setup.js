// Branchement des surfaces : orientation (éléments de rotation UAI, de mémoire), inclinaison de vue, points d'intérêt, brume.
// Pour chaque corps : addSurface(corps, carte géologique ou null, rotation, inclinaison de vue, points d'intérêt, options).
//  - rotation { a0, d0, W0, Wd } : pôle nord (ascension droite, déclinaison) et méridien origine W = W0 + Wd × jours depuis J2000, en degrés ;
//  - rotation { locked: true } : rotation synchrone, la face de longitude 0° regarde la planète (ou le corps `facing`).
// Les reliefs nommés viennent de js/names.js (nomenclature de l'UAI) ; ils sont rattachés au corps par son id.
const moonById = id => MOONS.find(m => m.id === id);
const LOCKED = { locked: true };

// Terre : Natural Earth 1:10 000 000 (terres, Antarctique, glaciers, lacs) ; rotation réelle (UAI : pôle nord, W = 190,147° + 360,9856235°/jour) donc point subsolaire exact
addSurface(EARTHB, SURF_EARTH, { a0: 0, d0: 90, W0: 190.147, Wd: 360.9856235 }, 23);

// Mars : carte géologique globale de l'USGS (SIM 3292)
addSurface(P('mars'), MARS_GEO, { a0: 317.68143, d0: 52.8865, W0: 176.63, Wd: 350.89198226 }, 25, [
  ['Jezero (Perseverance)', 77.5, 18.4], ['Gale (Curiosity)', 137.4, -4.6], ['Meridiani (Opportunity)', -5.5, -2], ['Gusev (Spirit)', 175.5, -14.6],
  ['Elysium (InSight)', 135.6, 4.5], ['Phoenix', -125.7, 68.2], ['Viking 1', -48, 22.5], ['Viking 2', 134, 48],
]);
// Mercure : pas de carte géologique globale trouvée en vecteur ; cratères et reliefs de la nomenclature
addSurface(P('mercure'), null, { a0: 281.0103, d0: 61.4155, W0: 329.5988, Wd: 6.1385108 }, 15);
// Vénus : surface cachée par les nuages ; reliefs de la nomenclature (radar Magellan)
addSurface(P('venus'), null, { a0: 272.76, d0: 67.16, W0: 160.2, Wd: -1.4813688 }, 15);

// Lune : carte géologique unifiée de l'USGS au 1:5 000 000 (Fortezzo, Spudis et Harrel, 2020)
addSurface(moonById('lune'), SURF_MOON, LOCKED, 15, [
  ['Apollo 11', 23.5, 0.7], ['Apollo 12', -23.4, -3], ['Apollo 14', -17.5, -3.7], ['Apollo 15', 3.6, 26.1], ['Apollo 16', 15.5, -9], ['Apollo 17', 30.8, 20.2],
  ['Chang\'e 4', 177.6, -45.5], ['Chang\'e 5', -51.9, 43.1],
]);
// Mars : Phobos et Déimos
addSurface(moonById('phobos'), null, LOCKED, 15);
addSurface(moonById('deimos'), null, LOCKED, 15);
// Lunes de Jupiter : cartes géologiques globales de l'USGS (Io : Williams et al. 2011 ; Europe : Leonard et al. 2024 ; Ganymède : Collins et al. 2014) ; Callisto : nomenclature seule
addSurface(moonById('io'), SURF_IO, LOCKED, 15, [['Loki Patera', 51, 12.6], ['Pele', 104.7, -18.7], ['Prometheus', -153.9, -1.5], ['Amirani', -114.8, 24.4], ['Tvashtar', -120.4, 62.1], ['Pillan', 116.7, -12]]);
addSurface(moonById('europe'), SURF_EUROPA, LOCKED, 15);
addSurface(moonById('ganymede'), SURF_GANYMEDE, LOCKED, 15);
addSurface(moonById('callisto'), null, LOCKED, 15);
// Lunes de Saturne : Titan (carte géomorphologique de Lopes et al. 2020, vue à travers la brume), les autres : nomenclature seule
addSurface(moonById('titan'), SURF_TITAN, LOCKED, 15, [['Huygens (2005)', -167.7, -10.6]], { haze: 'rgba(214,150,70,0.5)' });
for (const id of ['mimas', 'encelade', 'tethys', 'dione', 'rhea', 'japet']) addSurface(moonById(id), null, LOCKED, 15);
// Lunes d'Uranus, de Neptune, de Pluton ; Pluton fait toujours face à Charon (rotation rétrograde)
for (const id of ['miranda', 'ariel', 'umbriel', 'titania', 'oberon', 'triton', 'charon']) addSurface(moonById(id), null, LOCKED, 15);
addSurface(P('pluton'), null, { locked: true, facing: moonById('charon'), dir: -1 }, 15);
