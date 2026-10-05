// Vrai ciel étoilé : catalogue (≈ 5 000 étoiles), repère, couleurs, classes d'éclat.
import * as THREE from 'three';
import { STARS } from '../../src/engine/data/stars.js';
import { STAR_BINS, bvColor, starBin, starVector } from '../../src/engine/stars.js';

const fails = [], check = (c, m) => { console.log((c ? 'ok   ' : 'ÉCHEC ') + m); if (!c) fails.push(m); };
check(STARS.length > 4500 && STARS.length < 6000, 'catalogue : ' + STARS.length + ' étoiles de magnitude ≤ 6');
check(STARS.every(s => s[0] >= 0 && s[0] < 360 && s[1] >= -90 && s[1] <= 90 && Number.isFinite(s[2]) && Number.isFinite(s[3])), 'coordonnées, magnitudes et couleurs valides');
check(STARS[0][2] < -1 && STARS[STARS.length - 1][2] <= 6.1 && STARS.every((s, i) => i === 0 || s[2] >= STARS[i - 1][2]), 'triées de la plus brillante (Sirius ' + STARS[0][2] + ') à la plus faible');
const sirius = STARS[0], v = starVector(sirius[0], sirius[1], new THREE.Vector3());
check(Math.abs(sirius[0] - 101.29) < 0.3 && Math.abs(sirius[1] + 16.7) < 0.3, 'Sirius : α = ' + sirius[0] + '°, δ = ' + sirius[1] + '° (101,29° ; −16,72°)');
check(Math.abs(v.length() - 1) < 1e-9 && Math.abs(v.y - Math.sin(sirius[1] * Math.PI / 180)) < 1e-9, 'vecteur unitaire, y = sin(déclinaison) (y = pôle nord)');
check(starVector(0, 0, new THREE.Vector3()).x === 1 && Math.abs(starVector(90, 0, new THREE.Vector3()).z + 1) < 1e-9 && starVector(0, 90, new THREE.Vector3()).y === 1, 'repère : α = 0 → +x (point vernal), α = 90° → −z, pôle céleste nord → +y');
const polaris = STARS.find(s => s[1] > 89 && s[2] < 2.5);
check(!!polaris && polaris[2] > 1.8 && polaris[2] < 2.2, 'la Polaire est dans le catalogue (δ = ' + (polaris ? polaris[1] : '?') + '°, magnitude ' + (polaris ? polaris[2] : '?') + ')');
const blue = bvColor(-0.2), sun = bvColor(0.65), red = bvColor(1.7);
check(blue[2] > blue[0] && red[0] > red[2] && sun[0] >= sun[2], 'couleurs : une étoile bleue est bleutée (' + blue.map(x => x.toFixed(2)) + '), une rouge est rougeâtre (' + red.map(x => x.toFixed(2)) + ')');
check(starBin(-1.4) === 0 && starBin(2) === 1 && starBin(6) === STAR_BINS.length - 1 && STAR_BINS.every((b, i) => i === 0 || b.size < STAR_BINS[i - 1].size), 'classes d’éclat : les plus brillantes sont les plus grosses');
if (fails.length) { console.log(fails.length + ' échec(s)'); process.exit(1); }
