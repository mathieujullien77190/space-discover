// Fabrique les planètes et leurs lunes : public/objects/<astre>/<astre>.json + <astre>.jpg (carte dessinée) + card.png (fiche).
// Tout ce qui est dans les tables ci-dessous vient de la MÉMOIRE de l'auteur (éléments orbitaux moyens J2000, poles IAU, rayons, masses, faits) : À VÉRIFIER avant de les citer.
// Les cartes sont des dessins en aplats fabriqués par programme (bandes des géantes, cratères des lunes…) ; make-body-cards.mjs / sources réelles : voir CLAUDE.md.
// Usage : node tools/make-planets.mjs [id ...]   (sans argument : tout) puis node tools/make-objects.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { S, DEG, rng, disc, bandsMap, baseMap, spot, craters, cracks, blobs } from './lib-body-art.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), AU = 149597870.7, R_EARTH = 6378.137, G = 6.6743e-11;
const NOTE = "Données ÉCRITES DE MÉMOIRE (à vérifier) : éléments orbitaux moyens J2000, pôle et rotation IAU, rayon, masse, faits de la fiche. Carte dessinée et fiche fabriquées par tools/make-planets.mjs (aplats, pas une photo). Diamètre, masse, gravité, jour et année de la fiche sont CALCULÉS d'après ce JSON.";

// ---------- planètes : éléments moyens J2000 (a en UA, angles en °, période en jours), pôle (α0, δ0), méridien origine W = w0 + rate·jours ----------
const PLANETS = [
  { id: 'mercury', name: 'Mercure', icon: '⚫', order: 0.5, radius: 2439.7, mass: 3.3011e23, color: '#8c8279', dot: '#b5aaa0', el: { a: 0.38709927, e: 0.20563593, i: 7.00497902, L: 252.2503235, peri: 77.45779628, node: 48.33076593, period: 87.969 }, rot: [281.0097, 61.4143, 329.5469, 6.1385025],
    facts: [['Atmosphère', 'quasi nulle'], ['Température', '−180 °C à +430 °C'], ['Lunes', 'aucune'], ['Particularité', 'la plus petite planète, très cratérisée']], paint: { type: 'file', fallback: { type: 'craters', base: '#8d857c', dark: '#6f6860', light: '#aaa197', count: 900, seed: 11, rMax: 26 } } },
  { id: 'venus', name: 'Vénus', icon: '🟡', order: 0.7, radius: 6051.8, mass: 4.8675e24, color: '#e6cf96', dot: '#f0dca4', el: { a: 0.72333566, e: 0.00677672, i: 3.39467605, L: 181.9790995, peri: 131.60246718, node: 76.67984255, period: 224.701 }, rot: [272.76, 67.16, 160.2, -1.4813688],
    facts: [['Atmosphère', 'CO₂ (96 %), pression ≈ 92 fois celle de la Terre'], ['Température', '≈ 465 °C (la plus chaude)'], ['Lunes', 'aucune'], ['Rotation', 'rétrograde (le Soleil s’y lève à l’ouest)']], paint: { type: 'bands', palette: ['#f3e5b6', '#e8d29a', '#dcbf84', '#f7eecf'], n: 14, seed: 21, warp: 10, turb: 22, cell: 140 } },
  { id: 'jupiter', name: 'Jupiter', icon: '🟠', order: 5.1, radius: 71492, mass: 1.8982e27, color: '#c9a77c', dot: '#e0c9a0', el: { a: 5.202887, e: 0.04838624, i: 1.30439695, L: 34.39644051, peri: 14.72847983, node: 100.47390909, period: 4332.589 }, rot: [268.056595, 64.495303, 284.95, 870.536642],
    facts: [['Atmosphère', 'hydrogène 90 %, hélium 10 %'], ['Température', '≈ −110 °C (sommet des nuages)'], ['Lunes', '95 connues dont 4 galiléennes'], ['Particularité', 'la Grande Tache rouge, tempête vieille de plusieurs siècles']], paint: { type: 'jupiter' } },
  { id: 'saturn', name: 'Saturne', icon: '🪐', order: 5.2, radius: 60268, mass: 5.6834e26, color: '#e0cc96', dot: '#ecdcaa', el: { a: 9.53667594, e: 0.05386179, i: 2.48599187, L: 49.95424423, peri: 92.59887831, node: 113.66242448, period: 10759.22 }, rot: [40.589, 83.537, 38.9, 810.7939024],
    rings: { innerKm: 74658, outerKm: 136775, color: '#d9c8a0', opacity: 0.9, bands: [[0, 0.28, 0.35], [0.28, 0.69, 0.95], [0.69, 0.765, 0.08], [0.765, 0.95, 0.75], [0.955, 1, 0.7]] },
    facts: [['Atmosphère', 'hydrogène, hélium'], ['Anneaux', 'glace d’eau et roches, de 74 000 à 137 000 km du centre'], ['Lunes', '146 connues'], ['Densité', '0,69 g/cm³ (moins que l’eau)'], ['Température', '≈ −140 °C (sommet des nuages)']], paint: { type: 'bands', palette: ['#efe2b8', '#e3cf9c', '#d3b983', '#bfa271', '#f1e6c4'], n: 18, seed: 31, warp: 3, turb: 5, cell: 200, weights: [3, 3, 2, 1, 2] } },
  { id: 'uranus', name: 'Uranus', icon: '🔵', order: 5.3, radius: 25559, mass: 8.681e25, color: '#a9dde4', dot: '#bdeaf0', el: { a: 19.18916464, e: 0.04725744, i: 0.77263783, L: 313.23810451, peri: 170.9542763, node: 74.01692503, period: 30688.5 }, rot: [257.311, -15.175, 203.81, -501.1600928],
    facts: [['Atmosphère', 'hydrogène, hélium, méthane (couleur cyan)'], ['Inclinaison', 'axe couché à 98° : elle roule sur son orbite'], ['Température', '≈ −195 °C'], ['Lunes', '28 connues'], ['Anneaux', '13, ténus et sombres']], paint: { type: 'bands', palette: ['#b9e6ec', '#a9dde4', '#b0e1e8', '#c4ecf0'], n: 10, seed: 41, warp: 2, turb: 3, cell: 220 } },
  { id: 'neptune', name: 'Neptune', icon: '🔷', order: 5.4, radius: 24764, mass: 1.02413e26, color: '#3f6ae0', dot: '#6a90ee', el: { a: 30.06992276, e: 0.00859048, i: 1.77004347, L: -55.12002969, peri: 44.96476227, node: 131.78422574, period: 60182 }, rot: [299.36, 43.46, 253.18, 536.3128492],
    facts: [['Atmosphère', 'hydrogène, hélium, méthane'], ['Vents', '≈ 2 000 km/h, les plus rapides du système solaire'], ['Température', '≈ −200 °C'], ['Lunes', '16 connues, dont Triton'], ['Découverte', '1846, d’abord par le calcul']], paint: { type: 'neptune' } },
  { id: 'pluto', name: 'Pluton', type: 'dwarf', icon: '⚪', order: 5.5, radius: 1188.3, mass: 1.303e22, color: '#c8a68a', dot: '#d9bca3', el: { a: 39.48211675, e: 0.2488273, i: 17.14001206, L: 238.92903833, peri: 224.06891629, node: 110.30393684, period: 90560 }, rot: [132.993, -6.163, 302.695, 56.3625225],
    facts: [['Statut', 'planète naine'], ['Atmosphère', 'azote, très ténue'], ['Température', '≈ −230 °C'], ['Lunes', '5 (Charon, la plus grosse)'], ['Découverte', '1930']], paint: { type: 'file', fallback: { type: 'pluto' } } },
];

// ---------- lunes : a (km), e, i (° par rapport à l'équateur de la planète), période (jours, négative = rétrograde non utilisée : i > 90), rayon, masse ----------
const MOONS = [
  { id: 'phobos', parent: 'mars', name: 'Phobos', radius: 11.1, mass: 1.0659e16, a: 9376, e: 0.0151, i: 1.08, period: 0.31891, color: '#7d766e', facts: [['Forme', 'irrégulière, 27 × 22 × 18 km'], ['Particularité', 'tourne plus vite que Mars : elle s’y lève à l’ouest'], ['Destin', 'se rapproche de Mars, s’y écrasera dans ≈ 50 millions d’années']], paint: { type: 'craters', base: '#7b746c', dark: '#5f5953', light: '#938b82', count: 150, seed: 51, rMax: 16 } },
  { id: 'deimos', parent: 'mars', name: 'Déimos', radius: 6.2, mass: 1.4762e15, a: 23463, e: 0.0002, i: 1.79, period: 1.26244, color: '#8a8177', facts: [['Forme', 'irrégulière, 15 × 12 × 10 km'], ['Particularité', 'surface lisse, couverte de poussière']], paint: { type: 'craters', base: '#8a8178', dark: '#6f685f', light: '#9c9389', count: 70, seed: 52, rMax: 10 } },
  { id: 'io', parent: 'jupiter', name: 'Io', radius: 1821.6, mass: 8.9319e22, a: 421700, e: 0.0041, i: 0.04, period: 1.769138, color: '#e9d36a', facts: [['Particularité', 'le corps le plus volcanique du système solaire (> 400 volcans)'], ['Surface', 'soufre jaune, orange et rouge'], ['Orbite', 'résonance 1:2:4 avec Europe et Ganymède']], paint: { type: 'io' } },
  { id: 'europa', parent: 'jupiter', name: 'Europe', radius: 1560.8, mass: 4.7998e22, a: 671034, e: 0.0094, i: 0.47, period: 3.551181, color: '#e9e4d8', facts: [['Particularité', 'océan d’eau liquide sous une croûte de glace'], ['Surface', 'glace lisse striée de fractures brunes'], ['Intérêt', 'candidate à la vie hors de la Terre']], paint: { type: 'file', fallback: { type: 'europa' } } },
  { id: 'ganymede', parent: 'jupiter', name: 'Ganymède', radius: 2634.1, mass: 1.4819e23, a: 1070412, e: 0.0013, i: 0.2, period: 7.154553, color: '#8f8a82', facts: [['Particularité', 'la plus grande lune du système solaire (plus grosse que Mercure)'], ['Champ magnétique', 'seule lune qui en a un propre']], paint: { type: 'ganymede' } },
  { id: 'callisto', parent: 'jupiter', name: 'Callisto', radius: 2410.3, mass: 1.0759e23, a: 1882709, e: 0.0074, i: 0.19, period: 16.689018, color: '#5e564e', facts: [['Surface', 'la plus cratérisée du système solaire, vieille de 4 milliards d’années'], ['Intérieur', 'océan possible, sous la glace']], paint: { type: 'craters', base: '#5d554d', dark: '#443d37', light: '#b8b1a6', count: 700, seed: 54, rMax: 22 } },
  { id: 'amalthea', parent: 'jupiter', name: 'Amalthée', radius: 83.5, mass: 2.08e18, a: 181366, e: 0.0032, i: 0.37, period: 0.498179, color: '#a2492f', facts: [['Forme', 'irrégulière, 250 × 146 × 128 km'], ['Couleur', 'rougeâtre, l’une des plus rouges du système solaire']], paint: { type: 'craters', base: '#9c4a31', dark: '#7a3825', light: '#c46a4a', count: 120, seed: 55, rMax: 14 } },
  { id: 'mimas', parent: 'saturn', name: 'Mimas', radius: 198.2, mass: 3.75e19, a: 185539, e: 0.0196, i: 1.57, period: 0.942422, color: '#a9a69f', facts: [['Particularité', 'cratère Herschel : 130 km, un tiers de son diamètre (la « Étoile de la mort »)']], paint: { type: 'craters', base: '#a8a59e', dark: '#8a877f', light: '#c4c1b9', count: 420, seed: 61, rMax: 16, big: [0.32, 0.55, 54] } },
  { id: 'enceladus', parent: 'saturn', name: 'Encelade', radius: 252.1, mass: 1.08e20, a: 238042, e: 0.0047, i: 0.01, period: 1.370218, color: '#f4f7fa', facts: [['Particularité', 'geysers d’eau au pôle sud : ils alimentent l’anneau E'], ['Surface', 'la plus brillante du système solaire (glace fraîche)'], ['Intérieur', 'océan liquide sous la glace']], paint: { type: 'enceladus' } },
  { id: 'tethys', parent: 'saturn', name: 'Téthys', radius: 531.1, mass: 6.18e20, a: 294672, e: 0.0001, i: 0.17, period: 1.887802, color: '#cfcdc8', facts: [['Particularité', 'immense canyon Ithaca Chasma (≈ 2 000 km)'], ['Composition', 'presque pure glace d’eau']], paint: { type: 'craters', base: '#d0cec9', dark: '#aeaca6', light: '#e6e4df', count: 380, seed: 63, rMax: 18 } },
  { id: 'dione', parent: 'saturn', name: 'Dioné', radius: 561.4, mass: 1.095e21, a: 377415, e: 0.0022, i: 0, period: 2.736915, color: '#c9c7c2', facts: [['Surface', 'cratères et falaises de glace claires (« traînées »)'], ['Orbite', 'partage la sienne avec de petits compagnons']], paint: { type: 'craters', base: '#c9c7c1', dark: '#a8a6a0', light: '#e2e0da', count: 420, seed: 64, rMax: 18 } },
  { id: 'rhea', parent: 'saturn', name: 'Rhéa', radius: 763.8, mass: 2.31e21, a: 527068, e: 0.001, i: 0.35, period: 4.5175, color: '#bdbab4', facts: [['Particularité', 'deuxième lune de Saturne ; peut-être un système d’anneaux ténus'], ['Surface', 'cratérisée, glace d’eau']], paint: { type: 'craters', base: '#bdbab4', dark: '#9a978f', light: '#d8d5cf', count: 520, seed: 65, rMax: 20 } },
  { id: 'titan', parent: 'saturn', name: 'Titan', radius: 2574.7, mass: 1.3452e23, a: 1221870, e: 0.0288, i: 0.33, period: 15.945421, color: '#d99a3c', facts: [['Atmosphère', 'azote, plus dense que celle de la Terre (1,5 bar)'], ['Surface', 'lacs et rivières de méthane et d’éthane liquides'], ['Particularité', 'seule lune avec une vraie atmosphère ; sonde Huygens posée en 2005']], paint: { type: 'file', fallback: { type: 'titan' } } },
  { id: 'iapetus', parent: 'saturn', name: 'Japet', radius: 734.5, mass: 1.806e21, a: 3560820, e: 0.0286, i: 15.47, period: 79.3215, color: '#8f8a80', facts: [['Particularité', 'deux faces : l’une très sombre, l’autre très claire'], ['Relief', 'crête équatoriale de 20 km de haut sur 1 300 km']], paint: { type: 'iapetus' } },
  { id: 'miranda', parent: 'uranus', name: 'Miranda', radius: 235.8, mass: 6.4e19, a: 129900, e: 0.0013, i: 4.34, period: 1.413479, color: '#a9a6a1', facts: [['Relief', 'extrême : falaise de 20 km (Verona Rupes), terrains en « chevrons »']], paint: { type: 'miranda' } },
  { id: 'ariel', parent: 'uranus', name: 'Ariel', radius: 578.9, mass: 1.251e21, a: 190900, e: 0.0012, i: 0.04, period: 2.520379, color: '#b3b0aa', facts: [['Surface', 'la plus jeune des grandes lunes d’Uranus : vallées et canyons']], paint: { type: 'craters', base: '#b2afa9', dark: '#908d86', light: '#d3d0c9', count: 300, seed: 72, rMax: 16, cracks: 14 } },
  { id: 'umbriel', parent: 'uranus', name: 'Umbriel', radius: 584.7, mass: 1.275e21, a: 266000, e: 0.0039, i: 0.13, period: 4.144177, color: '#5f5c58', facts: [['Surface', 'la plus sombre des grandes lunes d’Uranus, anneau brillant (cratère Wunda)']], paint: { type: 'craters', base: '#5f5c58', dark: '#47443f', light: '#b3afa8', count: 420, seed: 73, rMax: 18 } },
  { id: 'titania', parent: 'uranus', name: 'Titania', radius: 788.4, mass: 3.4e21, a: 436300, e: 0.0011, i: 0.08, period: 8.705872, color: '#a7a29b', facts: [['Particularité', 'la plus grande lune d’Uranus'], ['Surface', 'cratères et grands canyons']], paint: { type: 'craters', base: '#a6a19a', dark: '#85807a', light: '#c8c3bb', count: 420, seed: 74, rMax: 18, cracks: 8 } },
  { id: 'oberon', parent: 'uranus', name: 'Obéron', radius: 761.4, mass: 3.076e21, a: 583500, e: 0.0014, i: 0.07, period: 13.463239, color: '#8c867e', facts: [['Surface', 'très cratérisée, fonds de cratères sombres']], paint: { type: 'craters', base: '#8b857d', dark: '#69645d', light: '#b0aaa1', count: 520, seed: 75, rMax: 20 } },
  { id: 'triton', parent: 'neptune', name: 'Triton', radius: 1353.4, mass: 2.14e22, a: 354759, e: 0.00002, i: 156.885, period: 5.876854, color: '#d9c2bd', facts: [['Orbite', 'rétrograde : probablement un objet capturé de la ceinture de Kuiper'], ['Particularité', 'geysers d’azote ; l’un des corps les plus froids (−235 °C)'], ['Destin', 'se rapproche de Neptune ; sera déchiré dans des milliards d’années']], paint: { type: 'triton' } },
  { id: 'proteus', parent: 'neptune', name: 'Protée', radius: 210, mass: 4.4e19, a: 117647, e: 0.0005, i: 0.52, period: 1.122315, color: '#6d6a67', facts: [['Forme', 'presque sphérique, un peu anguleuse (≈ 436 × 416 × 402 km)'], ['Surface', 'très sombre, grand cratère Pharos']], paint: { type: 'craters', base: '#6b6865', dark: '#52504d', light: '#8c8884', count: 220, seed: 82, rMax: 18 } },
  { id: 'charon', parent: 'pluto', name: 'Charon', radius: 606, mass: 1.586e21, a: 19591, e: 0.0002, i: 0, period: 6.38723, color: '#9b9794', facts: [['Particularité', 'moitié du diamètre de Pluton : un système double ; même face l’une vers l’autre'], ['Pôle nord', 'tache rougeâtre (« Mordor »)']], paint: { type: 'charon' } },
];

// ---------- peintres ----------
const PAINT = {
  craters: (w, h, p) => { const r = rng(p.seed), c = baseMap(w, h, p.base); blobs(c, r, 5, 40, 120, p.dark, 0.1, 0.9); craters(c, r, Math.round(p.count * w / 1024), 2, p.rMax * w / 1024 * 0.9, p.dark, p.light); if (p.big) spot(c, p.big[0] * w, p.big[1] * h, p.big[2] * w / 1024, p.big[2] * w / 1024, p.dark, p.light); if (p.cracks) cracks(c, r, p.cracks, p.dark, 2 * w / 1024); return c; },
  bands: (w, h, p) => bandsMap(w, h, p),
  jupiter: (w, h) => { const c = bandsMap(w, h, { palette: ['#efe3c8', '#d9bd92', '#b98a5e', '#8e5e3c', '#f4ede0', '#c89f74'], n: 24, seed: 91, warp: 9, turb: 14, cell: 160, weights: [3, 3, 2, 1, 2, 2] }); spot(c, 0.62 * w, 0.64 * h, 0.07 * w, 0.045 * h, '#c4573a', '#e9a27a'); spot(c, 0.62 * w, 0.64 * h, 0.035 * w, 0.02 * h, '#a4402c'); for (const [x, y] of [[0.2, 0.36], [0.36, 0.68], [0.82, 0.3], [0.9, 0.7]]) spot(c, x * w, y * h, 0.012 * w, 0.01 * h, '#f6efe2'); return c; },
  neptune: (w, h) => { const c = bandsMap(w, h, { palette: ['#4268e2', '#3a5fd6', '#4d78e8', '#2f4fc2'], n: 12, seed: 101, warp: 4, turb: 6, cell: 220 }); spot(c, 0.4 * w, 0.58 * h, 0.06 * w, 0.04 * h, '#223a96', '#6e8df0'); spot(c, 0.7 * w, 0.4 * h, 0.04 * w, 0.01 * h, '#e9f0ff'); return c; },
  io: (w, h) => { const r = rng(111), c = baseMap(w, h, '#e6cf63'); blobs(c, r, 14, 20, 70, '#d89a38'); blobs(c, r, 10, 14, 40, '#e9e2b0'); blobs(c, r, 12, 10, 36, '#c45a26'); for (let i = 0; i < 40; i++) spot(c, r() * w, r() * h, 4 + r() * 8, 4 + r() * 8, '#3b2f2b', '#e9a64a'); return c; },
  europa: (w, h) => { const r = rng(121), c = baseMap(w, h, '#ebe6da'); blobs(c, r, 10, 20, 60, '#d9cdb4'); blobs(c, r, 8, 15, 45, '#c7a07a'); cracks(c, r, 60, '#a5744a', 2.2, 360); cracks(c, r, 40, '#8a5f3d', 1.3, 260); craters(c, r, 25, 3, 12, '#cfc3ab', '#f6f1e6'); return c; },
  ganymede: (w, h) => { const r = rng(131), c = baseMap(w, h, '#8f8a82'); blobs(c, r, 12, 30, 90, '#5d5851', 0.1, 0.9); blobs(c, r, 10, 20, 70, '#b3aea4', 0.1, 0.9); craters(c, r, 260, 2, 18, '#7b766e', '#d6d1c7'); cracks(c, r, 14, '#6c675f', 1.5, 200); return c; },
  enceladus: (w, h) => { const r = rng(141), c = baseMap(w, h, '#f5f8fb'); craters(c, r, 140, 2, 14, '#dfe7ee', '#ffffff'); cracks(c, r, 6, '#8fb7d9', 3.2, 150); for (let i = 0; i < 4; i++) { const g = c.getContext('2d'); g.strokeStyle = '#7fa9d0'; g.lineWidth = 4; g.beginPath(); const y = 0.9 * h + i * 4; g.moveTo(0.25 * w + i * 30, y); g.bezierCurveTo(0.4 * w, y - 20, 0.6 * w, y + 20, 0.8 * w - i * 30, y); g.stroke(); } return c; },
  titan: (w, h) => bandsMap(w, h, { palette: ['#dba247', '#d49a3c', '#e0ad57', '#c88c34'], n: 9, seed: 151, warp: 2, turb: 3, cell: 240 }),
  iapetus: (w, h) => { const r = rng(161), c = baseMap(w, h, '#ebe6da'), g = c.getContext('2d'); g.fillStyle = '#3a332e'; g.beginPath(); g.ellipse(0.25 * w, 0.5 * h, 0.27 * w, 0.4 * h, 0, 0, 2 * Math.PI); g.fill(); blobs(c, r, 10, 20, 60, '#4a4039', 0.3, 0.7); craters(c, r, 300, 2, 14, '#9d968a', '#d6d0c4'); return c; },
  miranda: (w, h) => { const r = rng(171), c = baseMap(w, h, '#a9a6a1'); blobs(c, r, 8, 30, 80, '#8c8984'); blobs(c, r, 6, 25, 70, '#c9c6c0'); cracks(c, r, 22, '#6f6c68', 2, 200); craters(c, r, 180, 2, 14, '#8a8782', '#cfccc6'); spot(c, 0.6 * w, 0.5 * h, 0.08 * w, 0.2 * h, '#bdbab4', '#6f6c68'); return c; },
  triton: (w, h) => { const r = rng(181), c = baseMap(w, h, '#dcc7c0'); blobs(c, r, 10, 25, 70, '#c9a9a4'); blobs(c, r, 6, 20, 60, '#e8dad5', 0.55, 1); cracks(c, r, 36, '#5d4a48', 1.8, 90); for (let i = 0; i < 14; i++) spot(c, r() * w, (0.55 + r() * 0.4) * h, 3, 7, '#4a3a38'); craters(c, r, 60, 2, 10, '#bfa29c', '#efe4df'); return c; },
  pluto: (w, h) => { const r = rng(191), c = baseMap(w, h, '#c8a68a'); blobs(c, r, 14, 25, 80, '#a98066'); blobs(c, r, 8, 20, 60, '#d9bca3'); for (let i = 0; i < 8; i++) spot(c, (0.1 + i * 0.12) * w, (0.5 + (r() - 0.5) * 0.12) * h, 0.04 * w, 0.045 * h, '#5b3d33'); spot(c, 0.5 * w, 0.4 * h, 0.1 * w, 0.14 * h, '#efe6dc', '#d9cdbf'); craters(c, r, 60, 2, 10, '#a98066', null); return c; },
  charon: (w, h) => { const r = rng(201), c = baseMap(w, h, '#9b9794'); blobs(c, r, 8, 30, 90, '#85817e'); blobs(c, r, 5, 40, 90, '#a8a49f'); craters(c, r, 90, 2, 12, '#7f7b78', '#b7b3ae'); spot(c, 0.5 * w, 0.06 * h, 0.5 * w, 0.1 * h, '#7d4b3a'); return c; },
};
// type « file » : la carte réelle stylisée par tools/make-real-maps.mjs est déjà écrite (on s'en sert pour la fiche) ; sinon, dessin par programme (spec.fallback)
const paintOf = async (spec, w, h, id) => { if (spec.type === 'file') { const f = out(id, id + '.jpg'); if (fs.existsSync(f)) return { canvas: await loadImage(fs.readFileSync(f)), keep: true }; return paintOf(spec.fallback, w, h, id); } return { canvas: PAINT[spec.type](w, h, spec), keep: false }; };

// ---------- JSON + images ----------
const out = (id, f) => path.join(root, 'public', 'objects', id, f);
const writeJson = (id, obj) => { fs.mkdirSync(path.join(root, 'public', 'objects', id), { recursive: true }); fs.writeFileSync(out(id, id + '.json'), JSON.stringify(obj, null, 2) + '\n'); };
const fmtFacts = facts => facts.map(([label, value]) => ({ label, value }));
const ru = km => km / R_EARTH;
const rotation = ([ra, dec, w0, rate]) => ({ poleRaDeg: ra, poleDecDeg: dec, w0Deg: w0, rateDegPerDay: rate });
const cardFacts = f => ({ _note: NOTE, image: 'card.png', facts: fmtFacts(f) });

const saturnCard = (planetCanvas, rings, lonlat) => {   // Saturne : disque + anneaux (moitié arrière, planète, moitié avant)
  const c = createCanvas(S, S), g = c.getContext('2d'), cx = S / 2, cy = S / 2, tilt = -0.32, planet = disc(planetCanvas, ...lonlat, 190);
  const arcs = (front) => { for (const [f, t, al] of rings.bands) for (let k = 0; k <= 8; k++) { const frac = f + (t - f) * k / 8, rr = (rings.innerKm + frac * (rings.outerKm - rings.innerKm)) / rings.outerKm * 165; g.save(); g.translate(cx, cy); g.rotate(tilt); g.beginPath(); g.ellipse(0, 0, rr, rr * 0.28, 0, front ? 0 : Math.PI, front ? Math.PI : 2 * Math.PI); g.strokeStyle = `rgba(217,200,160,${Math.min(1, al)})`; g.lineWidth = 2.2; g.stroke(); g.restore(); } };
  arcs(false); g.drawImage(planet, cx - 95, cy - 95); arcs(true); return c;
};

const only = process.argv.slice(2);
const want = id => !only.length || only.includes(id);
const planetById = Object.fromEntries(PLANETS.map(p => [p.id, p]));
const saveTex = (id, canvas) => fs.writeFileSync(out(id, id + '.jpg'), canvas.toBuffer('image/jpeg', 90));
const saveCard = (id, canvas) => fs.writeFileSync(out(id, 'card.png'), canvas.toBuffer('image/png'));

for (const p of PLANETS) {
  const el = p.el, ruP = ru(p.radius), maxA = Math.max(0, ...MOONS.filter(m => m.parent === p.id).map(m => ru(m.a)));
  const json = {
    kind: 'body', displayPriority: 2, bodyType: p.type || 'planet', name: p.name, radiusKm: p.radius, massKg: p.mass, around: 'sun',
    motion: { frame: 'heliocentric', model: 'kepler', semiMajorAxisKm: Math.round(el.a * AU), eccentricity: el.e, inclinationDeg: el.i, nodeDeg: el.node, argPerigeeDeg: +(el.peri - el.node).toFixed(5), meanAnomalyDeg: +(((el.L - el.peri) % 360 + 360) % 360).toFixed(5), epochD2000: 0, periodDays: el.period },
    appearance: Object.assign({ kind: 'textured', texture: p.id + '.jpg', color: p.color }, p.rings ? { rings: p.rings } : {}),
    rotation: Object.assign({ _note: 'Éléments IAU, DE MÉMOIRE (à vérifier) : pôle nord (α0, δ0) J2000 et méridien origine W = w0 + rate × jours depuis J2000.' }, rotation(p.rot)),
    trace: { fullOrbit: true, color: p.dot }, dot: { color: p.dot, minDistanceUnits: 300 },
    label: { text: p.name, metricText: p.name + ' · Ø {diameterKm} km', minDistanceUnits: 300 },
    menu: { order: p.order, icon: p.icon, view: { distanceUnits: +Math.max(1.2, 5.5 * ruP * (p.rings ? 2.2 : 1)).toFixed(3), text: 'Vue de ' + p.name + ' : planète décrite par ses éléments orbitaux (objects/' + p.id + '/' + p.id + '.json)' } },
    card: cardFacts(p.facts),
  };
  if (!want(p.id)) continue;
  writeJson(p.id, json);
  const art = await paintOf(p.paint, 2048, 1024, p.id), tex = art.canvas; if (!art.keep) saveTex(p.id, tex);
  saveCard(p.id, p.rings ? saturnCard(tex, p.rings, [20, 8]) : disc(tex, 20, 12));
  console.log(p.id, 'planète', p.rings ? '+ anneaux' : '', 'lunes à ' + Math.round(maxA) + ' rayons terrestres au plus');
}
for (const [k, m] of MOONS.entries()) {
  const parent = m.parent === 'mars' ? { id: 'mars', radius: 3389.5 } : planetById[m.parent], planetMaxA = Math.max(...MOONS.filter(x => x.parent === m.parent).map(x => ru(x.a))), ruM = ru(m.radius);
  if (!want(m.id)) continue;
  const moonOrder = 6 + k * 0.01;
  const json = {
    kind: 'body', displayPriority: 1, bodyType: 'moon', name: m.name, radiusKm: m.radius, massKg: m.mass, around: m.parent,
    motion: { frame: 'heliocentric', model: 'kepler', planeOf: true, semiMajorAxisKm: m.a, eccentricity: m.e, inclinationDeg: m.i, nodeDeg: (k * 47) % 360, argPerigeeDeg: (k * 113) % 360, meanAnomalyDeg: (k * 71) % 360, epochD2000: 0, periodDays: m.period,
      _note: 'Inclinaison et nœud comptés par rapport à l’ÉQUATEUR de la planète (planeOf) ; a, e, i, période de mémoire (à vérifier) ; nœud, périastre et position de départ sont ILLUSTRATIFS (la vraie position de la lune à une date donnée n’est pas modélisée).' },
    appearance: { kind: 'textured', texture: m.id + '.jpg', color: m.color }, orientation: 'tidal-lock',
    showWithinUnits: Math.round(Math.max(60, 20 * planetMaxA)),
    trace: { fullOrbit: true, color: '#6f7a8a' }, dot: { color: '#cfd6e0', minDistanceUnits: 0, hideBelowUnits: +(30 * ruM).toFixed(5) },
    label: { text: m.name, metricText: m.name + ' · Ø {diameterKm} km', minDistanceRadii: 6 },
    menu: { order: moonOrder, icon: '⚪', view: { distanceUnits: +Math.max(0.0005, 6 * ruM).toFixed(5), text: 'Vue de ' + m.name + ', lune de ' + (planetById[m.parent] ? planetById[m.parent].name : 'Mars') + ' : même face toujours tournée vers sa planète' } },
    card: cardFacts(m.facts),
  };
  writeJson(m.id, json);
  const art = await paintOf(m.paint, 1024, 512, m.id), tex = art.canvas; if (!art.keep) saveTex(m.id, tex); saveCard(m.id, disc(tex, 0, 8));
  console.log(m.id, 'lune de', m.parent, '(' + Math.round(ru(m.a)) + ' rayons terrestres de sa planète)');
}
