// Courbes de niveau colorées : décodage Terrarium, une couleur par tranche de 100 m, traits aux changements de tranche, mers en bleu, sommets en blanc.
import { CONTOUR_STEP_M, bandColor, paintContours, terrariumElevation } from '../../src/engine/contours.js';

const fails = [], check = (c, m) => { console.log((c ? 'ok   ' : 'ÉCHEC ') + m); if (!c) fails.push(m); };
check(terrariumElevation(128, 0, 0) === 0 && terrariumElevation(128, 100, 0) === 100 && terrariumElevation(127, 255, 128) === -0.5, 'décodage Terrarium : 0 m, 100 m, −0,5 m');
check(CONTOUR_STEP_M === 100, 'une courbe tous les 100 m');
const keys = new Set(); for (let k = 0; k < 40; k++) keys.add(bandColor(k).join());
check(keys.size === 40, '40 bandes de 100 m (0 à 4 000 m) : 40 couleurs différentes');
let same = true; for (let k = -10; k < 40; k++) if (bandColor(k).join() === bandColor(k + 1).join()) same = false;
check(same, 'deux bandes voisines n’ont jamais la même couleur');
const sea = bandColor(-20), high = bandColor(45), low = bandColor(1);
check(sea[2] > sea[0] && sea[2] > sea[1] * 0.9, 'sous le niveau de la mer : bleu (' + sea.join(',') + ')');
check(high.every(v => v > 230), 'au-dessus de 4 200 m : blanc (' + high.join(',') + ')');
check(low[1] > low[0] && low[1] > low[2], 'basses terres : vert (' + low.join(',') + ')');
// tuile synthétique : rampe de 0 à 1 000 m sur 100 pixels → 10 bandes, donc 9 traits verticaux
const W = 100, H = 8, px = new Uint8ClampedArray(W * H * 4);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const e = x * 10 + 0.5 + 32768, i = 4 * (y * W + x); px[i] = Math.floor(e / 256); px[i + 1] = Math.floor(e % 256); px[i + 2] = 0; px[i + 3] = 255; }
const out = paintContours(px, W, H, 1000);
const lum = x => { const i = 4 * (3 * W + x); return out[i] + out[i + 1] + out[i + 2]; };
let lines = 0; for (let x = 1; x < W - 2; x++) if (lum(x) < 0.9 * Math.min(lum(x - 1), lum(x + 1)) && lum(x) < lum(x - 1) + 1) lines++;
check(out.length === W * H * 4 && out[3] === 255, 'tuile peinte : ' + W + ' × ' + H + ' pixels opaques');
check(lines >= 8 && lines <= 10, 'rampe de 0 à 1 000 m : ' + lines + ' courbes (9 attendues)');
if (fails.length) { console.log(fails.length + ' échec(s)'); process.exit(1); }
