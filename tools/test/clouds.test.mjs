// Couverture nuageuse : opacité selon l'altitude (on ne traverse pas la couche), URLs et crédit.
import { cloudsLevel, CLOUDS_CREDIT, CLOUDS_FADE_KM, CLOUDS_R, CLOUDS_URL, cloudsOpacity } from '../../src/engine/clouds.js';

const fails = [], check = (c, m) => { console.log((c ? 'ok   ' : 'ÉCHEC ') + m); if (!c) fails.push(m); };
check(cloudsOpacity(5) === 0 && cloudsOpacity(1200) === 0 && cloudsOpacity(CLOUDS_FADE_KM[0]) === 0, 'sous 1 200 km (vue détaillée) : nuages retirés');
check(cloudsOpacity(1500) > 0.9 && cloudsOpacity(20000) > 0.9, 'à 1 500 km et au-delà : opacité pleine (' + cloudsOpacity(1500).toFixed(2) + ')');
check(cloudsOpacity(1300) > 0 && cloudsOpacity(1300) < cloudsOpacity(1450), 'entre 1 200 et 1 500 km : fondu progressif');
check(CLOUDS_R > 1 && (CLOUDS_R - 1) * 6378 > 5 && (CLOUDS_R - 1) * 6378 < 20, 'couche à ' + Math.round((CLOUDS_R - 1) * 6378) + ' km d’altitude');
check(CLOUDS_URL.low.startsWith('https://') && CLOUDS_URL.high.includes('4096') && CLOUDS_URL.ultra.includes('8192'), 'URLs https, 2048 puis 4096 puis 8192');
check(cloudsLevel(2000, 16384, false) === 'ultra' && cloudsLevel(2000, 4096, false) === 'high' && cloudsLevel(2000, 16384, true) === 'high' && cloudsLevel(10000, 16384, false) === 'high' && cloudsLevel(60000, 16384, false) === 'low', 'image 8192 × 4096 sous 4 000 km (GPU ≥ 8192 px, pas sur écran tactile), 4096 jusqu’à 30 000 km, 2048 au-delà');
check(/matteason/.test(CLOUDS_CREDIT), 'crédit : ' + CLOUDS_CREDIT);
if (fails.length) { console.log(fails.length + ' échec(s)'); process.exit(1); }
