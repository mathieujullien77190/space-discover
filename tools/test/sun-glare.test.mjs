// Éclat du Soleil : image (cœur blanc, halo, aigrettes), opacité devant / derrière la Terre, taille selon la distance.
import { createCanvas } from '@napi-rs/canvas';
import { glareOpacityFor, GLARE_OPACITY, AU_UNITS, GLARE_MIN_SCALE, GLARE_PX, GLARE_SIZE, SUN_HIDE_UNITS, glarePixels, paintGlare } from '../../src/engine/sun-glare.js';

const fails = [], check = (c, m) => { console.log((c ? 'ok   ' : 'ÉCHEC ') + m); if (!c) fails.push(m); };
const cv = createCanvas(GLARE_SIZE, GLARE_SIZE), g = cv.getContext('2d'); paintGlare(g, GLARE_SIZE);
const px = (x, y) => Array.from(g.getImageData(Math.round(x), Math.round(y), 1, 1).data), c = GLARE_SIZE / 2;
const center = px(c, c);
check(center[0] > 250 && center[1] > 250 && center[2] > 240 && center[3] > 250, 'cœur blanc opaque : ' + center);
const corner = px(2, 2);
check(corner[3] < 3, 'les coins sont transparents (alpha ' + corner[3] + ') : pas de carré visible');
const r = c * 0.5, onStreak = px(c + r, c), offStreak = px(c + r * Math.cos(Math.PI / 12), c + r * Math.sin(Math.PI / 12));
check(onStreak[3] > offStreak[3] + 3, 'une traînée diffuse passe à 50 % du rayon : alpha ' + onStreak[3] + ' sur l’axe contre ' + offStreak[3] + ' entre deux traînées');
let maxStep = 0, prev = px(c + r, c)[3], mono = true; for (let dy = 1; dy <= 24; dy++) { const a = px(c + r, c + dy)[3]; maxStep = Math.max(maxStep, Math.abs(a - prev)); if (a > prev + 1) mono = false; prev = a; }
check(maxStep <= 8 && mono, 'profil en travers d’une traînée DOUX (aucun bord net) : saut maximal de ' + maxStep + ' d’alpha entre deux pixels, décroissant');
const halo = px(c + c * 0.12, c + c * 0.12 * 0.5);
check(halo[3] > 30, 'halo lumineux autour du cœur (alpha ' + halo[3] + ')');
const bluish = px(c + c * 0.3, c + c * 0.05);
check(bluish[2] >= bluish[0], 'le halo extérieur est bleuté (' + bluish.slice(0, 3) + ')');
check(glarePixels(AU_UNITS) === GLARE_PX && glarePixels(4 * AU_UNITS) < glarePixels(AU_UNITS) && glarePixels(1e9) === GLARE_PX * GLARE_MIN_SCALE, 'taille : ' + GLARE_PX + ' px à 1 UA, plus petite au loin (plancher ' + GLARE_PX * GLARE_MIN_SCALE + ' px)');
check(glarePixels(SUN_HIDE_UNITS - 1) === 0, 'dans le Soleil : pas d’éblouissement');
check(glareOpacityFor(0) === GLARE_OPACITY && glareOpacityFor(1) < 0.45 * GLARE_OPACITY && glareOpacityFor(0.5) < glareOpacityFor(0) && glareOpacityFor(0.5) > glareOpacityFor(1), 'Soleil bas (observatoire) : éclat moins brillant (' + glareOpacityFor(1).toFixed(2) + ' à l’horizon contre ' + GLARE_OPACITY + ' en haut)');
if (fails.length) { console.log(fails.length + ' échec(s)'); process.exit(1); }
