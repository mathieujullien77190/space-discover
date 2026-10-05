// Voie lactée : repère galactique exact (centre et pôle aux bonnes coordonnées équatoriales), bande brillante au centre, sombre hors du plan, fondu selon la hauteur du Soleil.
import * as THREE from 'three';
import { GALACTIC_CENTER, GALACTIC_FROM_EQUATORIAL, GALACTIC_POLE, MILKY_MAX_OPACITY, localToGalactic, milkyWayOpacity, milkyWayPixel, milkyWayQuaternion, paintMilkyWay } from '../../src/engine/milkyway.js';
import { starVector } from '../../src/engine/stars.js';

const fails = [], check = (c, m) => { console.log((c ? 'ok   ' : 'ÉCHEC ') + m); if (!c) fails.push(m); };
const eq = (ra, dec) => starVector(ra, dec, new THREE.Vector3());   // vecteur de la scène
const toEq = v => [v.x, -v.z, v.y];                                  // scène (x, y, z) → équatorial (X, Y, Z) = (x, −z, y)
const gal = (ra, dec) => { const e = toEq(eq(ra, dec)); return GALACTIC_FROM_EQUATORIAL.map(r => r[0] * e[0] + r[1] * e[1] + r[2] * e[2]); };
const gc = gal(GALACTIC_CENTER.ra, GALACTIC_CENTER.dec), np = gal(GALACTIC_POLE.ra, GALACTIC_POLE.dec);
check(Math.abs(gc[0] - 1) < 2e-3 && Math.abs(gc[1]) < 2e-3 && Math.abs(gc[2]) < 2e-3, 'le centre galactique (α 266,4°, δ −28,9°) est en (1, 0, 0) dans le repère galactique : ' + gc.map(x => x.toFixed(3)));
check(Math.abs(np[2] - 1) < 2e-3, 'le pôle nord galactique (α 192,9°, δ +27,1°) est en (0, 0, 1) : ' + np.map(x => x.toFixed(3)));
// orientation du maillage : le vecteur local qui répond au centre galactique est amené sur la bonne direction du ciel
const q = milkyWayQuaternion(), lc = new THREE.Vector3(1, 0, 0), ln = new THREE.Vector3(0, 1, 0);
const g1 = localToGalactic(1, 0, 0), g2 = localToGalactic(0, 1, 0);
check(g1[0] === 1 && g2[2] === 1, 'local (1, 0, 0) → centre galactique ; local y → pôle galactique');
check(lc.applyQuaternion(q).angleTo(eq(GALACTIC_CENTER.ra, GALACTIC_CENTER.dec)) < 1e-2 && ln.applyQuaternion(q).angleTo(eq(GALACTIC_POLE.ra, GALACTIC_POLE.dec)) < 1e-2, 'le maillage est orienté : centre et pôle galactiques au bon endroit du ciel (à 0,6° près)');
const lum = c => 0.3 * c[0] + 0.6 * c[1] + 0.1 * c[2];
const at = (l, b) => { const L = l * Math.PI / 180, B = b * Math.PI / 180; return milkyWayPixel(Math.cos(B) * Math.cos(L), Math.cos(B) * Math.sin(L), Math.sin(B)); };
const avg = (f, n = 400) => { let s = 0; for (let i = 0; i < n; i++) s += f(i); return s / n; };
const planeCenter = avg(i => lum(at(-20 + 40 * i / 400, 0))), planeAnti = avg(i => lum(at(150 + 60 * i / 400, 0))), pole = avg(i => lum(at(i * 0.9, 80))), offPlane = avg(i => lum(at(-20 + 40 * i / 400, 30)));
check(planeCenter > 0.15 && planeCenter > planeAnti * 1.4, 'plan galactique : lumineux vers le centre (' + planeCenter.toFixed(2) + ') et plus faible vers l’anticentre (' + planeAnti.toFixed(2) + ')');
check(planeAnti > pole * 4 && planeCenter > offPlane * 5, 'bande bien marquée : anticentre ' + planeAnti.toFixed(2) + ' contre pôle ' + pole.toFixed(3) + ' ; centre ' + planeCenter.toFixed(2) + ' contre b = 30° : ' + offPlane.toFixed(3));
const warm = at(0, 0), cold = at(180, 0);
check(warm[0] / warm[2] > cold[0] / cold[2], 'centre plus chaud (jaune-orangé) que l’anticentre (bleuté)');
const px = paintMilkyWay(64, 32), mx = Math.max(...px.filter((_, i) => i % 4 === 0));
check(px.length === 64 * 32 * 4 && mx > 120, 'texture dessinée (64 × 32 RGBA, valeur max ' + mx + ')');
check(milkyWayOpacity(0.5) === 0 && milkyWayOpacity(-0.1) === 0 && milkyWayOpacity(-0.2) === 0 && Math.abs(milkyWayOpacity(-0.32) - MILKY_MAX_OPACITY) < 1e-9 && milkyWayOpacity(-0.9) === MILKY_MAX_OPACITY, 'fondu : nulle de jour et au crépuscule (Soleil au-dessus de −11,5°), pleine sous −18,6°');
check(milkyWayOpacity(-0.26) > 0 && milkyWayOpacity(-0.26) < MILKY_MAX_OPACITY && milkyWayOpacity(-0.24) < milkyWayOpacity(-0.28), 'entre les deux : fondu progressif (avant et après la pleine nuit)');
if (fails.length) { console.log(fails.length + ' échec(s)'); process.exit(1); }
