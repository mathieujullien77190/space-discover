// Infos étoiles : fiche (nom, constellation, couleur, température, descriptif) et visée la plus proche du clic.
import { STARS } from '../../src/engine/data/stars.js';
import { STAR_NAMES } from '../../src/engine/data/star-names.js';
import { FAMOUS, colorClass, constellationName, pickNearest, starByHip, starDetails, temperatureK } from '../../src/engine/star-info.js';

const fails = [], check = (c, m) => { console.log((c ? 'ok   ' : 'ÉCHEC ') + m); if (!c) fails.push(m); };
check(STARS.every(s => Number.isInteger(s[4])) && new Set(STARS.map(s => s[4])).size === STARS.length, 'chaque étoile a un numéro Hipparcos unique (' + STARS.length + ')');
const named = Object.values(STAR_NAMES).filter(n => n[0]).length;
check(Object.keys(STAR_NAMES).length > 1500 && named > 400, 'noms : ' + Object.keys(STAR_NAMES).length + ' étoiles désignées, ' + named + ' avec un nom propre');
const sirius = starDetails(STARS[0]);
check(sirius.title === 'Sirius' && sirius.constellation === 'Grand Chien' && sirius.famous && /Alpha \(α\)/.test(sirius.subtitle), 'Sirius : ' + sirius.title + ', ' + sirius.subtitle + ', ' + sirius.constellation);
check(/magnitude −1,4/.test(sirius.text) && /brillantes du ciel/.test(sirius.text) && sirius.tempK > 8000 && sirius.tempK < 11000, 'descriptif de Sirius : température ≈ ' + sirius.tempK + ' K');
check(starByHip(32349) === STARS[0], 'recherche par numéro Hipparcos (HIP 32349 = Sirius)');
const anon = STARS.find(s => !STAR_NAMES[s[4]]), a = starDetails(anon);
check(a.title === 'Étoile HIP ' + anon[4] && !a.famous && /magnitude/.test(a.text), 'étoile sans nom : ' + a.title);
const bayerOnly = STARS.find(s => STAR_NAMES[s[4]] && !STAR_NAMES[s[4]][0] && STAR_NAMES[s[4]][1] === 'β'), b = starDetails(bayerOnly);
check(/^Bêta \(β\) · /.test(b.title), 'désignation de Bayer en français : « ' + b.title + ' »');
const names = Object.values(STAR_NAMES).map(n => n[0]);
const hit = Object.keys(FAMOUS).filter(k => names.includes(k) || k === 'Rigil');
check(hit.length > 40, 'descriptifs de mémoire reliés à des étoiles du catalogue : ' + hit.length + ' sur ' + Object.keys(FAMOUS).length);
check(colorClass(-0.2) === 'bleue' && colorClass(0.65).startsWith('jaune') && colorClass(1.6) === 'rouge' && temperatureK(0.65) > 5400 && temperatureK(0.65) < 6000 && constellationName('UMa') === 'Grande Ourse', 'couleur, température (Soleil ≈ ' + temperatureK(0.65) + ' K), constellations en français');
// visée : projection factice (x = ascension droite en pixels, y = 100)
const proj = s => [s[0], 100];
const i = pickNearest(proj, STARS[0][0] + 3, 100, 14);
check(i === 0, 'clic à 3 px de Sirius : Sirius est choisie');
check(pickNearest(proj, STARS[0][0] + 300, 5000, 14) === -1, 'clic loin de toute étoile : rien');
check(pickNearest(proj, STARS[0][0], 100, 14, k => k !== 0) !== 0, 'les étoiles non visibles sont ignorées');
if (fails.length) { console.log(fails.length + ' échec(s)'); process.exit(1); }
