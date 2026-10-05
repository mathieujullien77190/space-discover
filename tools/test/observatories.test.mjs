// Observatoires : position (France), repère local orthonormé, œil au-dessus du sol, fiche complète.
import { OBSERVATORIES, observatoryById, observatoryFrame } from '../../src/engine/observatories.js';

const fails = [], check = (c, m) => { console.log((c ? 'ok   ' : 'ÉCHEC ') + m); if (!c) fails.push(m); };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], len = a => Math.hypot(a[0], a[1], a[2]);
const o = observatoryById('pic-du-midi');
check(!!o && OBSERVATORIES.length >= 10, 'Pic du Midi présent, ' + OBSERVATORIES.length + ' observatoires dans le monde');
check(new Set(OBSERVATORIES.map(x => x.id)).size === OBSERVATORIES.length && OBSERVATORIES.every(x => Math.abs(x.lat) < 89 && Math.abs(x.lon) <= 180 && x.altM >= 0 && x.facts.length >= 4 && /vérifier/.test(x.note)), 'identifiants uniques, coordonnées valides, fiches complètes « à vérifier »');
check(o.lat > 41 && o.lat < 51.5 && o.lon > -5.5 && o.lon < 9.7, 'en France métropolitaine : ' + o.lat + '° N, ' + o.lon + '° E');
check(o.altM > 2800 && o.altM < 2950 && o.eyeM > 30 && o.eyeM < 300, 'altitude du sol ' + o.altM + ' m, œil à ' + o.eyeM + ' m au-dessus (la caméra reste au-dessus du maillage du relief)');
const f = observatoryFrame(o);
check([f.up, f.east, f.north, f.south].every(v => Math.abs(len(v) - 1) < 1e-9), 'haut, est, nord et sud sont des vecteurs unitaires');
check(Math.abs(dot(f.up, f.east)) < 1e-9 && Math.abs(dot(f.up, f.north)) < 1e-9 && Math.abs(dot(f.east, f.north)) < 1e-9, 'repère local orthogonal');
check(f.north[1] > 0 && f.south[1] < 0, 'le nord pointe vers le pôle nord (y > 0), le sud en sens inverse');
check(Math.abs(len(f.eye) - (1 + (o.altM + o.eyeM) / 6378137)) < 1e-12 && len(f.eye) > len(f.ground), 'œil à ' + (len(f.eye) * 6378.137 - 6378.137).toFixed(3) + ' km d’altitude, au-dessus du sol (' + (len(f.ground) * 6378.137 - 6378.137).toFixed(3) + ' km)');
check(Math.abs(f.up[1] - Math.sin(o.lat * Math.PI / 180)) < 1e-9, 'y = sin(latitude)');
check(o.facts.length >= 4 && /vérifier/.test(o.note), 'fiche : ' + o.facts.length + ' faits, avec la mention « à vérifier » (écrits de mémoire)');
if (fails.length) { console.log(fails.length + ' échec(s)'); process.exit(1); }
