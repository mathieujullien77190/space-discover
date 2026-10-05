// Voie lactée : repère galactique exact, 45 000 petites étoiles dans le vrai contour (plus denses vers le centre), luminosités très variées et faibles, fondu selon la hauteur du Soleil.
import * as THREE from 'three';
import { GALACTIC_CENTER, GALACTIC_FROM_EQUATORIAL, GALACTIC_POLE, MILKY_BRIGHT_MIN, MILKY_DIM, MILKY_MAX_OPACITY, milkyWayOpacity, milkyWayStars } from '../../src/engine/milkyway.js';
import { starVector } from '../../src/engine/stars.js';

const fails = [], check = (c, m) => { console.log((c ? 'ok   ' : 'ÉCHEC ') + m); if (!c) fails.push(m); };
const eq = (ra, dec) => starVector(ra, dec, new THREE.Vector3());   // vecteur de la scène
const toEq = v => [v.x, -v.z, v.y];                                  // scène (x, y, z) → équatorial (X, Y, Z) = (x, −z, y)
const gal = (ra, dec) => { const e = toEq(eq(ra, dec)); return GALACTIC_FROM_EQUATORIAL.map(r => r[0] * e[0] + r[1] * e[1] + r[2] * e[2]); };
const gc = gal(GALACTIC_CENTER.ra, GALACTIC_CENTER.dec), np = gal(GALACTIC_POLE.ra, GALACTIC_POLE.dec);
check(Math.abs(gc[0] - 1) < 2e-3 && Math.abs(gc[1]) < 2e-3 && Math.abs(gc[2]) < 2e-3, 'le centre galactique (α 266,4°, δ −28,9°) est en (1, 0, 0) dans le repère galactique : ' + gc.map(x => x.toFixed(3)));
check(Math.abs(np[2] - 1) < 2e-3, 'le pôle nord galactique (α 192,9°, δ +27,1°) est en (0, 0, 1) : ' + np.map(x => x.toFixed(3)));
check(milkyWayOpacity(0.5) === 0 && milkyWayOpacity(-0.1) === 0 && milkyWayOpacity(-0.2) === 0 && Math.abs(milkyWayOpacity(-0.32) - MILKY_MAX_OPACITY) < 1e-9 && milkyWayOpacity(-0.9) === MILKY_MAX_OPACITY, 'fondu : nulle de jour et au crépuscule (Soleil au-dessus de −11,5°), pleine sous −18,6°');
check(milkyWayOpacity(-0.26) > 0 && milkyWayOpacity(-0.26) < MILKY_MAX_OPACITY && milkyWayOpacity(-0.24) < milkyWayOpacity(-0.28), 'entre les deux : fondu progressif (avant et après la pleine nuit)');
// petites étoiles de fond : plus de 40 000, semées dans la bande galactique, plus denses vers le centre
{
  const st = milkyWayStars();
  const galOf = i => { const e = [st.pos[3 * i], -st.pos[3 * i + 2], st.pos[3 * i + 1]], g = GALACTIC_FROM_EQUATORIAL.map(r => r[0] * e[0] + r[1] * e[1] + r[2] * e[2]); return { b: Math.asin(g[2]) * 180 / Math.PI, l: Math.atan2(g[1], g[0]) * 180 / Math.PI }; };
  let inBand = 0, sumB = 0, center = 0, anti = 0, bright = 0;
  for (let i = 0; i < st.n; i++) { const { b, l } = galOf(i); if (Math.abs(b) < 25) inBand++; sumB += Math.abs(b); if (Math.abs(l) < 30 && Math.abs(b) < 10) center++; if (Math.abs(Math.abs(l) - 180) < 30 && Math.abs(b) < 10) anti++; if (st.lum[i] > 0.62) bright++; }
  check(st.n >= 45000 && st.n <= 55000, 'étoiles de fond : ' + st.n + ' points');
  check(inBand / st.n > 0.9 && sumB / st.n < 10, 'dans la bande galactique : ' + (100 * inBand / st.n).toFixed(1) + ' % à moins de 25° du plan, latitude moyenne |b| = ' + (sumB / st.n).toFixed(1) + '°');
  check(center > anti * 1.8, 'plus denses vers le centre galactique (' + center + ' points) que vers l’anticentre (' + anti + ')');
  const sorted = Array.from(st.lum).sort((a, b) => a - b), med = sorted[Math.floor(st.n / 2)], p99 = sorted[Math.floor(st.n * 0.99)];
  check(med < 0.15 && p99 > 0.5, 'luminosités très variées, surtout vers le bas : médiane ' + med.toFixed(3) + ', 99e centile ' + p99.toFixed(2) + ' (échelle 0–1)');
  check(bright / st.n > 0.03 && bright / st.n < 0.35, 'points « brillants » (> ' + MILKY_BRIGHT_MIN + ') : ' + (100 * bright / st.n).toFixed(0) + ' %');
  check(Math.abs(MILKY_DIM - 0.2) < 1e-9, 'luminosité globale cinq fois moindre (× ' + MILKY_DIM.toFixed(2) + ')');
  check(Array.from({ length: st.n }, (_, i) => Math.hypot(st.pos[3 * i], st.pos[3 * i + 1], st.pos[3 * i + 2])).every(x => Math.abs(x - 1) < 1e-5), 'tous les points sur la sphère unité');
}
if (fails.length) { console.log(fails.length + ' échec(s)'); process.exit(1); }
