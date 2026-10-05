// Option « Capitales » : données (200 capitales en français) et anti-chevauchement des étiquettes.
import { CAPITALS } from '../../src/engine/data/capitals.js';
import { overlaps } from '../../src/engine/capitals.js';

const fails = [], check = (c, m) => { console.log((c ? 'ok   ' : 'ÉCHEC ') + m); if (!c) fails.push(m); };
check(CAPITALS.length >= 190 && CAPITALS.length <= 215, CAPITALS.length + ' capitales');
check(CAPITALS.every(c => typeof c[0] === 'string' && c[0] && c[1] >= -90 && c[1] <= 90 && c[2] >= -180 && c[2] <= 180), 'noms, latitudes et longitudes valides');
const at = (re, lat, lon, tol = 1) => { const c = CAPITALS.find(x => re.test(x[0])); return !!c && Math.abs(c[1] - lat) < tol && Math.abs(c[2] - lon) < tol; };
check(at(/^Paris$/, 48.86, 2.35) && at(/^Tokyo$/, 35.69, 139.69) && at(/^Washington/, 38.9, -77.0) && at(/^Brasilia|^Brasília/, -15.8, -47.9) && at(/^Canberra$/, -35.3, 149.1), 'Paris, Tokyo, Washington, Brasília, Canberra aux bonnes coordonnées (à 1° près)');
check(CAPITALS.some(c => /^Bruxelles$/.test(c[0])) && CAPITALS.some(c => /^Le Caire$/.test(c[0])), 'noms en français (Bruxelles, Le Caire)');
check(CAPITALS.every((c, i) => i === 0 || c[3] <= CAPITALS[i - 1][3]), 'triées par population décroissante (les plus grandes gardent leur étiquette)');
check(overlaps([0, 0, 50, 18], [40, 10, 50, 18]) && !overlaps([0, 0, 50, 18], [60, 0, 50, 18]) && !overlaps([0, 0, 50, 18], [0, 30, 50, 18]), 'chevauchement de deux étiquettes : détecté, ou non quand elles sont côte à côte');
if (fails.length) { console.log(fails.length + ' échec(s)'); process.exit(1); }
