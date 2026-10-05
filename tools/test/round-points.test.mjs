// Points ronds : disque doux (centre plein, bord transparent, symétrique), matériau avec texture d'alpha.
import { ROUND_SIZE, roundAlpha, roundPointsMaterial, roundTexture } from '../../src/engine/round-points.js';

const fails = [], check = (c, m) => { console.log((c ? 'ok   ' : 'ÉCHEC ') + m); if (!c) fails.push(m); };
check(roundAlpha(0) === 1 && roundAlpha(0.55) === 1 && roundAlpha(1) === 0 && roundAlpha(1.3) === 0, 'alpha : 1 au centre et jusqu’à 55 % du rayon, 0 au bord et au-delà');
check(roundAlpha(0.7) > roundAlpha(0.85) && roundAlpha(0.85) > roundAlpha(0.98) && roundAlpha(0.7) < 1, 'descente progressive (monotone) entre 55 % et le bord');
const t = roundTexture(), d = t.image.data, n = ROUND_SIZE, a = (i, j) => d[(j * n + i) * 4 + 3];
check(t === roundTexture(), 'texture partagée (une seule)');
check(a(n / 2, n / 2) === 255 && a(0, 0) === 0 && a(n - 1, 0) === 0 && a(0, n - 1) === 0 && a(n - 1, n - 1) === 0, 'centre opaque, quatre coins transparents (ce qui fait un disque et non un carré)');
let sym = true; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if (a(i, j) !== a(n - 1 - i, n - 1 - j)) sym = false;
check(sym, 'symétrique');
let opaque = 0; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if (a(i, j) > 128) opaque++;
check(opaque / (n * n) > 0.35 && opaque / (n * n) < 0.7, 'pixels plus d’à moitié opaques : ' + (100 * opaque / (n * n)).toFixed(0) + ' % du carré (un disque, pas un carré plein)');
const m = roundPointsMaterial({ size: 3, color: 0xff0000 });
check(m.map === t && m.transparent === true && m.alphaTest > 0 && m.size === 3 && m.color.r === 1, 'matériau : texture ronde, transparent, options conservées');
if (fails.length) { console.log(fails.length + ' échec(s)'); process.exit(1); }
