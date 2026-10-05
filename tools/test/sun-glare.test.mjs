// Éclat du Soleil : image (cœur blanc, halo, aigrettes), opacité devant / derrière la Terre, taille selon la distance.
import { createCanvas } from '@napi-rs/canvas';
import { AU_UNITS, GLARE_MIN_SCALE, GLARE_PX, GLARE_SIZE, SUN_HIDE_UNITS, glareOpacity, glarePixels, paintGlare } from '../../src/engine/sun-glare.js';

const fails = [], check = (c, m) => { console.log((c ? 'ok   ' : 'ÉCHEC ') + m); if (!c) fails.push(m); };
const cv = createCanvas(GLARE_SIZE, GLARE_SIZE), g = cv.getContext('2d'); paintGlare(g, GLARE_SIZE);
const px = (x, y) => Array.from(g.getImageData(Math.round(x), Math.round(y), 1, 1).data), c = GLARE_SIZE / 2;
const center = px(c, c);
check(center[0] > 250 && center[1] > 250 && center[2] > 240 && center[3] > 250, 'cœur blanc opaque : ' + center);
const corner = px(2, 2);
check(corner[3] < 3, 'les coins sont transparents (alpha ' + corner[3] + ') : pas de carré visible');
const r = c * 0.5, onSpike = px(c + r, c), offSpike = px(c + r * Math.cos(Math.PI / 12), c + r * Math.sin(Math.PI / 12));
check(onSpike[3] > offSpike[3] + 5, 'une aigrette passe à 50 % du rayon : alpha ' + onSpike[3] + ' sur le rayon contre ' + offSpike[3] + ' entre deux rayons');
const halo = px(c + c * 0.12, c + c * 0.12 * 0.5);
check(halo[3] > 30, 'halo lumineux autour du cœur (alpha ' + halo[3] + ')');
const bluish = px(c + c * 0.3, c + c * 0.05);
check(bluish[2] >= bluish[0], 'le halo extérieur est bleuté (' + bluish.slice(0, 3) + ')');
const ang = Math.asin(1 / 1.1);
check(glareOpacity(0, ang) === 0 && glareOpacity(ang * 0.5, ang) === 0, 'Soleil derrière le disque de la Terre : éblouissement éteint');
check(glareOpacity(ang * 1.2, ang) === 1, 'Soleil bien au-delà du bord : éblouissement plein');
check(glareOpacity(ang * 0.97, ang) > 0 && glareOpacity(ang * 0.97, ang) < 1 && glareOpacity(ang * 1.0, ang) < glareOpacity(ang * 1.04, ang), 'au bord de la Terre : fondu progressif (le lever de soleil éblouit avant d’apparaître)');
check(glarePixels(AU_UNITS) === GLARE_PX && glarePixels(4 * AU_UNITS) < glarePixels(AU_UNITS) && glarePixels(1e9) === GLARE_PX * GLARE_MIN_SCALE, 'taille : ' + GLARE_PX + ' px à 1 UA, plus petite au loin (plancher ' + GLARE_PX * GLARE_MIN_SCALE + ' px)');
check(glarePixels(SUN_HIDE_UNITS - 1) === 0, 'dans le Soleil : pas d’éblouissement');
if (fails.length) { console.log(fails.length + ' échec(s)'); process.exit(1); }
