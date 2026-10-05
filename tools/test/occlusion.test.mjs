// Occultation : un astre derrière un autre n'est pas affiché.
import { occludedBy } from '../../src/engine/occlusion.js';

const fails = [], check = (c, m) => { console.log((c ? 'ok   ' : 'ÉCHEC ') + m); if (!c) fails.push(m); };
const cam = [0, 0, 0], jup = { p: [0, 0, 100], r: 5, id: 'jupiter' };
check(occludedBy(cam, [0, 0, 400], [jup]) === 'jupiter', 'Pluton pile derrière Jupiter : caché');
check(occludedBy(cam, [0, 0, 50], [jup]) === null, 'devant Jupiter : visible');
check(occludedBy(cam, [40, 0, 400], [jup]) === null, 'loin du disque de Jupiter : visible');
check(occludedBy(cam, [19, 0, 400], [jup]) === 'jupiter' && occludedBy(cam, [21, 0, 400], [jup]) === null, 'le bord du disque : rayon angulaire 5/100 → 400 × 0,05 = 20 unités à cette distance');
check(occludedBy(cam, [0, 0, 400], [{ p: [0, 0, -100], r: 5 }]) === null, 'un astre derrière la caméra n’occulte rien');
check(occludedBy([0, 0, 99], [0, 0, 400], [jup]) === null, 'caméra dans l’occulteur : pas d’occultation');
check(occludedBy(cam, [30, 0, 400], [{ p: [0, 0, 100], r: 0.01, id: 'a' }], 0.05) === null && occludedBy(cam, [2, 0, 400], [{ p: [0, 0, 100], r: 0.01, id: 'a' }], 0.05) === 'a', 'occulteur dessiné comme un point : rayon minimal en radians (0,05 → 20 unités à 400)');
check(occludedBy(cam, [0, 0, 400], [{ p: [0, 0, 200], r: 5 }, jup]) !== null, 'plusieurs occulteurs : le premier qui cache suffit');
check(occludedBy(cam, [0, 0, 400], [{ p: [0, 0, 100], r: 0.01, id: 'a' }], 0.05, 100) === null, 'un gros astre (rayon 100) n’est pas caché par un petit point');
check(occludedBy(cam, [0, 0, 400], [jup], 0, 1) === 'jupiter' && occludedBy(cam, [18, 0, 400], [jup], 0, 5) === null, 'la cible doit tenir ENTIÈRE dans le disque de l’occulteur');
if (fails.length) { console.log(fails.length + ' échec(s)'); process.exit(1); }
