// Données : Soleil, planètes, lunes (rayons, orbites, apparence, textes) et taches de surface.
// =====================================================================
//  DONNÉES (rayons équatoriaux en km ; demi-grands axes en UA pour les planètes, en km pour les lunes ;
//  éléments orbitaux moyens pour J2000 — approximation pour positions plausibles 1800-2050)
//  a : demi-grand axe ; e : excentricité ; T : période orbitale (jours) ; L0 : longitude moyenne à J2000 (°) ;
//  w : longitude du périhélie (°) ; rot : période de rotation (heures, négatif = rétrograde)
// =====================================================================
const SUN = { id: 'soleil', name: 'Soleil', kind: 'Étoile', R: 695700, rot: 609.1, look: { sun: true },
  facts: ["Une étoile naine jaune qui contient environ 99,86 % de toute la masse du système solaire.",
          "Son diamètre est d'environ 1,39 million de km, soit 109 fois celui de la Terre.",
          "Sa lumière met environ 8 min 20 s pour atteindre la Terre."] };

const PLANETS = [
  { id: 'mercure', name: 'Mercure', kind: 'Planète tellurique', R: 2439.7, a: 0.38710, e: 0.20563, T: 87.969, L0: 252.25032, w: 77.45780, rot: 1407.6,
    look: { base: '#8d867f', spots: ['#6f6a64', '#a39b92'], n: 70 },
    facts: ["La plus petite planète, et la plus proche du Soleil.", "Une année y dure 88 jours, mais un jour solaire y dure environ 176 jours terrestres.", "La température passe d'environ −180 °C la nuit à plus de 400 °C le jour."] },
  { id: 'venus', name: 'Vénus', kind: 'Planète tellurique', R: 6051.8, a: 0.72333, e: 0.00677, T: 224.701, L0: 181.97910, w: 131.60247, rot: -5832.5,
    look: { base: '#e4c383', bands: [['#d9b36a', -0.9, -0.3], ['#ecd29a', -0.3, 0.3], ['#d9b36a', 0.3, 0.9]], atm: '#f0d9a0' },
    facts: ["Presque de la taille de la Terre, mais avec une atmosphère de gaz carbonique environ 90 fois plus pesante.", "Environ 465 °C en surface : la planète la plus chaude, à cause de l'effet de serre.", "Elle tourne à l'envers, et un jour sidéral (243 jours terrestres) y dure plus longtemps qu'une année (225 jours)."] },
  { id: 'terre', name: 'Terre', kind: 'Planète tellurique', R: 6378.1, a: 1.00000, e: 0.01671, T: 365.256, L0: 100.46457, w: 102.93768, rot: 23.934,
    look: { base: '#2b5fa8', atm: '#6fa8ff' },
    facts: ["La seule planète où l'on connaît de la vie. Environ 71 % de sa surface est couverte d'eau.", "Sa Lune est grosse par rapport à elle : environ 27 % de son diamètre."] },
  { id: 'mars', name: 'Mars', kind: 'Planète tellurique', R: 3396.2, a: 1.52368, e: 0.09340, T: 686.980, L0: 355.44657, w: 336.05637, rot: 24.623,
    look: { base: '#b5532e', atm: '#e0a080' },
    facts: ["Rouge à cause de la rouille (oxyde de fer) de son sol.", "Elle abrite Olympus Mons, un volcan d'environ 22 km de haut, le plus haut connu du système solaire.", "Deux petites lunes : Phobos et Déimos.", "Sa surface est dessinée d'après la carte géologique globale de l'USGS : hautes terres anciennes au sud, plaines basses au nord, grands volcans de Tharsis, bassins d'impact comme Hellas, calottes polaires."] },
  { id: 'jupiter', name: 'Jupiter', kind: 'Planète géante gazeuse', R: 71492, a: 5.20260, e: 0.04849, T: 4332.589, L0: 34.39644, w: 14.72848, rot: 9.925,
    look: { base: '#c9a27a', bands: [['#b88e66', -0.95, -0.7], ['#e4cfa8', -0.7, -0.5], ['#a87b54', -0.5, -0.32], ['#d9bf96', -0.32, -0.1], ['#9a6c48', -0.1, 0.1], ['#e4cfa8', 0.1, 0.3], ['#a87b54', 0.3, 0.5], ['#d9bf96', 0.5, 0.7], ['#b88e66', 0.7, 0.95]], grs: true },
    facts: ["La plus grosse planète : plus de 2 fois la masse de toutes les autres planètes réunies, et environ 11 fois le diamètre de la Terre.", "La Grande Tache rouge est une tempête observée depuis des siècles.", "Un jour n'y dure qu'environ 10 heures."] },
  { id: 'saturne', name: 'Saturne', kind: 'Planète géante gazeuse', R: 60268, a: 9.55491, e: 0.05551, T: 10759.22, L0: 49.95424, w: 92.59888, rot: 10.656,
    look: { base: '#dcc58a', bands: [['#cdb273', -0.95, -0.55], ['#e8d9aa', -0.55, -0.2], ['#d6bf86', -0.2, 0.2], ['#e8d9aa', 0.2, 0.55], ['#cdb273', 0.55, 0.95]], rings: true },
    facts: ["Ses anneaux sont faits surtout de glace d'eau. Les anneaux principaux (D, C, B, A) vont de 67 000 à 137 000 km du centre de Saturne, mais font souvent une dizaine de mètres d'épaisseur seulement.", "On y distingue la division de Cassini (≈ 4 600 km de large), les lacunes d'Encke et de Keeler, puis plus loin les anneaux F (très fin), G et E (très ténu, alimenté par les geysers d'Encelade).", "Sa densité moyenne est inférieure à celle de l'eau.", "Titan, sa plus grosse lune, a une atmosphère épaisse."] },
  { id: 'uranus', name: 'Uranus', kind: 'Géante de glace', R: 25559, a: 19.21845, e: 0.04630, T: 30688.5, L0: 313.23810, w: 170.95428, rot: -17.24,
    look: { base: '#8fd6d8', bands: [['#86cdd0', -0.9, -0.4], ['#9adbdd', -0.4, 0.4], ['#86cdd0', 0.4, 0.9]], atm: '#a8eef0' },
    facts: ["Son axe est incliné d'environ 98° : elle roule pour ainsi dire sur son orbite.", "Découverte en 1781 par William Herschel, première planète trouvée au télescope.", "Un tour autour du Soleil dure 84 ans."] },
  { id: 'neptune', name: 'Neptune', kind: 'Géante de glace', R: 24764, a: 30.11039, e: 0.00899, T: 60182, L0: 304.87997, w: 44.96476, rot: 16.11,
    look: { base: '#3f63d6', bands: [['#3a5bc8', -0.9, -0.3], ['#4a70e0', -0.3, 0.3], ['#3a5bc8', 0.3, 0.9]], spots: ['#27408f'], n: 4, big: true, atm: '#6f93ff' },
    facts: ["La plus lointaine des huit planètes. Découverte en 1846 par le calcul, avant même d'être vue.", "Des vents qui dépassent 2 000 km/h.", "Une année dure environ 165 ans : elle a fait son premier tour depuis sa découverte en 2011."] },
  { id: 'pluton', name: 'Pluton', kind: 'Planète naine', R: 1188.3, a: 39.48212, e: 0.24883, T: 90560, L0: 238.92881, w: 224.06892, rot: -153.3,
    look: { base: '#c8b59c', spots: ['#a58a70', '#e8dccb', '#8d765f'], n: 24, big: true },
    facts: ["Planète naine depuis 2006. Son orbite est très allongée et croise parfois celle de Neptune.", "Sa lune Charon fait environ la moitié de son diamètre : on parle presque d'un système double.", "Survolée par la sonde New Horizons en 2015."] },
];
const P = id => PLANETS.find(p => p.id === id);
// lunes : a en km ; T en jours ; retro : tourne dans le sens inverse de sa planète
const MOONS = [
  { id: 'lune', name: 'Lune', of: 'terre', R: 1737.4, a: 384400, T: 27.3217, look: { base: '#8f8c87' },
    facts: ["Toujours la même face tournée vers la Terre.", "À 384 400 km : la lumière met environ 1,3 seconde pour y arriver.", "Le seul astre où des humains ont marché, entre 1969 et 1972.", "Sa surface est dessinée d'après la carte géologique unifiée de l'USGS (2020) : mers de basalte sombres, hautes terres claires, cratères récents brillants. L'orientation suit la phase réelle."] },
  { id: 'phobos', name: 'Phobos', of: 'mars', R: 11.3, a: 9376, T: 0.31891, look: { base: '#7a6f66' },
    facts: ["Une petite lune irrégulière d'environ 22 km de large, qui tourne autour de Mars en à peine plus de 7 heures.", "Elle se rapproche lentement de Mars et finira par se désintégrer dans quelques dizaines de millions d'années."] },
  { id: 'deimos', name: 'Déimos', of: 'mars', R: 6.2, a: 23463, T: 1.263, look: { base: '#8a7e72' }, facts: ["La plus petite et la plus lointaine des deux lunes de Mars, d'environ 12 km de large."] },
  { id: 'io', name: 'Io', of: 'jupiter', R: 1821.6, a: 421700, T: 1.769, look: { base: '#d9c35a', spots: ['#8a4a20', '#e8e08a', '#6a3a18'], n: 30 },
    facts: ["Le monde le plus volcanique du système solaire : des centaines de volcans actifs.", "Réchauffée en permanence par les marées de Jupiter.", "Sa surface est dessinée d'après la carte géologique de l'USGS (Williams et al., 2011) : plaines de soufre, coulées de lave, fonds sombres des patères (volcans), montagnes."] },
  { id: 'europe', name: 'Europe', of: 'jupiter', R: 1560.8, a: 671034, T: 3.551, look: { base: '#d8cdb8', spots: ['#a8744f', '#c9b9a0'], n: 20 },
    facts: ["Sous sa croûte de glace se cacherait un océan d'eau liquide, l'un des meilleurs endroits où chercher de la vie.", "Sa surface est dessinée d'après la carte géologique globale de l'USGS (Leonard et al., 2024) : plaines striées, bandes, terrains chaotiques, cratères."] },
  { id: 'ganymede', name: 'Ganymède', of: 'jupiter', R: 2634.1, a: 1070412, T: 7.155, look: { base: '#9b8e7f', spots: ['#6e6358', '#b8ab9b'], n: 40 },
    facts: ["La plus grande lune du système solaire : plus grosse que la planète Mercure.", "Sa surface est dessinée d'après la carte géologique globale de l'USGS (Collins et al., 2014) : terrains sombres anciens, terrains clairs sillonnés, cratères, palimpsestes."] },
  { id: 'callisto', name: 'Callisto', of: 'jupiter', R: 2410.3, a: 1882709, T: 16.689, look: { base: '#6e6258', spots: ['#8a7d6e', '#52483f'], n: 60 },
    facts: ["Une des surfaces les plus cratérisées du système solaire, ancienne et presque inchangée depuis des milliards d'années."] },
  { id: 'mimas', name: 'Mimas', of: 'saturne', R: 198.2, a: 185539, T: 0.942, look: { base: '#b9b6b0' }, facts: ["Un énorme cratère, Herschel, lui donne l'air de l'Étoile de la Mort de la saga Star Wars."] },
  { id: 'encelade', name: 'Encelade', of: 'saturne', R: 252.1, a: 238042, T: 1.370, look: { base: '#eef2f6' }, facts: ["Des geysers jaillissent de son pôle sud : un océan d'eau liquide se cache sous la glace."] },
  { id: 'tethys', name: 'Téthys', of: 'saturne', R: 531.1, a: 294619, T: 1.888, look: { base: '#dcdcd8' }, facts: ["Une lune de glace presque pure, traversée par un immense canyon, Ithaca Chasma."] },
  { id: 'dione', name: 'Dioné', of: 'saturne', R: 561.4, a: 377396, T: 2.737, look: { base: '#cfcfcb' }, facts: ["Une lune de glace d'eau striée de longues falaises claires."] },
  { id: 'rhea', name: 'Rhéa', of: 'saturne', R: 763.8, a: 527108, T: 4.518, look: { base: '#c4c1bb', spots: ['#a8a59e'], n: 30 }, facts: ["La deuxième plus grande lune de Saturne."] },
  { id: 'titan', name: 'Titan', of: 'saturne', R: 2574.7, a: 1221870, T: 15.945, look: { base: '#d99a4a', atm: '#e8b060' },
    facts: ["La seule lune avec une atmosphère épaisse, plus dense que celle de la Terre au sol.", "Des lacs et des rivières de méthane et d'éthane liquides.", "La sonde Huygens s'y est posée en 2005."] },
  { id: 'japet', name: 'Japet', of: 'saturne', R: 734.5, a: 3560820, T: 79.33, look: { base: '#9a948a' }, facts: ["Un hémisphère très clair et un hémisphère très sombre."] },
  { id: 'miranda', name: 'Miranda', of: 'uranus', R: 235.8, a: 129390, T: 1.413, look: { base: '#b0b4b8' }, facts: ["Un paysage incroyablement bosselé, avec une falaise d'environ 20 km de haut."] },
  { id: 'ariel', name: 'Ariel', of: 'uranus', R: 578.9, a: 191020, T: 2.520, look: { base: '#b8bcc0' }, facts: ["Une surface relativement jeune, sillonnée de vallées."] },
  { id: 'umbriel', name: 'Umbriel', of: 'uranus', R: 584.7, a: 266300, T: 4.144, look: { base: '#6e7074' }, facts: ["La plus sombre des grandes lunes d'Uranus."] },
  { id: 'titania', name: 'Titania', of: 'uranus', R: 788.4, a: 435910, T: 8.706, look: { base: '#a9adb1' }, facts: ["La plus grande lune d'Uranus. Les lunes d'Uranus portent des noms de personnages de Shakespeare et de Pope."] },
  { id: 'oberon', name: 'Obéron', of: 'uranus', R: 761.4, a: 583520, T: 13.463, look: { base: '#8e8c8a' }, facts: ["La deuxième plus grande lune d'Uranus, très cratérisée."] },
  { id: 'triton', name: 'Triton', of: 'neptune', R: 1353.4, a: 354759, T: 5.877, retro: true, look: { base: '#cdd2d6', spots: ['#e8d8d8', '#b4bcc4'], n: 18 },
    facts: ["La seule grande lune qui tourne dans le sens inverse de sa planète : sans doute un astre capturé.", "Voyager 2 y a vu des geysers d'azote."] },
  { id: 'charon', name: 'Charon', of: 'pluton', R: 606, a: 19591, T: 6.387, look: { base: '#8f8a86', spots: ['#6e5a50'], n: 10 }, facts: ["La grande lune de Pluton : les deux astres se montrent toujours la même face."] },
];
const BODIES = [SUN, ...PLANETS, ...MOONS];
BODIES.forEach((b, i) => { b.idx = i; b.moons = []; b.spin = 0; });
for (const m of MOONS) { m.parent = P(m.of); m.parent.moons.push(m); m.rot = m.T * 24; m.kind = 'Lune de ' + m.parent.name; m.ph0 = (m.idx * 2.399) % 6.283; }

for (const p of PLANETS) p.parent = SUN;

const EARTHB = P('terre');

// taches de surface réparties sur la sphère (longitude, latitude) : elles tournent avec le corps
for (const b of BODIES) {
  const L = b.look; b.feat = [];
  if (!L.spots && !L.sun && !L.clouds) continue;
  const r = rng(hash(b.id)), n = (L.spots || L.sun) ? (L.sun ? 7 : (L.n || 20)) : 0;
  for (let i = 0; i < n; i++) {
    const lat = L.sun ? (r() - 0.5) * 1.0 : Math.asin(r() * 2 - 1);
    b.feat.push({ lon: r() * 6.283, lat, s: L.sun ? 0.07 + r() * 0.05 : (L.big ? 0.12 + r() * 0.2 : 0.04 + r() * 0.1), col: L.sun ? '#8a4a10' : L.spots[Math.floor(r() * L.spots.length)] });
  }
  if (L.clouds) for (let i = 0; i < 22; i++) b.feat.push({ lon: r() * 6.283, lat: Math.asin(r() * 1.6 - 0.8), s: 0.1 + r() * 0.15, col: 'rgba(255,255,255,0.55)', cloud: true });
}
