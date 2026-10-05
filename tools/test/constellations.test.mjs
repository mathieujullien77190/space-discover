// Constellations : données (88 + tracés + noms en français) et segments.
import { CONSTELLATIONS } from '../../src/engine/data/constellations.js';
import { constellationSegments } from '../../src/engine/constellations.js';
import { STARS } from '../../src/engine/data/stars.js';

const fails = [], check = (c, m) => { console.log((c ? 'ok   ' : 'ÉCHEC ') + m); if (!c) fails.push(m); };
check(CONSTELLATIONS.length >= 85 && CONSTELLATIONS.length <= 90, CONSTELLATIONS.length + ' constellations');
const uma = CONSTELLATIONS.find(c => c[0] === 'UMa');
check(!!uma && uma[1] === 'Grande Ourse' && uma[3].length >= 3, 'la Grande Ourse (la « casserole ») a ses tracés : ' + (uma ? uma[3].length + ' lignes' : '?'));
check(CONSTELLATIONS.some(c => c[1] === 'Orion') && CONSTELLATIONS.some(c => c[1] === 'Cassiopée') && CONSTELLATIONS.some(c => c[1] === 'Croix du Sud'), 'Orion, Cassiopée, Croix du Sud : noms en français');
const seg = constellationSegments();
check(seg.length % 6 === 0 && seg.length / 6 > 600 && seg.length / 6 < 900, (seg.length / 6) + ' segments');
let unit = true; for (let i = 0; i < seg.length; i += 3) if (Math.abs(Math.hypot(seg[i], seg[i + 1], seg[i + 2]) - 1) > 1e-5) unit = false;
check(unit, 'tous les sommets sont sur la sphère unité');
// les extrémités des tracés sont de VRAIES étoiles du catalogue : on cherche une étoile à moins de 0,2° de chaque sommet de la Grande Ourse
const near = (ra, dec) => STARS.some(s => Math.hypot((((s[0] - ra + 540) % 360) - 180) * Math.cos(dec * Math.PI / 180), s[1] - dec) < 0.2);
const pts = uma[3].flat(), hit = pts.filter(p => near(p[0], p[1])).length;
check(hit / pts.length > 0.9, 'les sommets de la Grande Ourse sont des étoiles du catalogue (' + hit + '/' + pts.length + ')');
if (fails.length) { console.log(fails.length + ' échec(s)'); process.exit(1); }
