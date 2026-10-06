// Rentrée atmosphérique : densité de l'air, flux de chaleur ρ·v³, érosion, profil mis en scène, shader.
import * as THREE from 'three';
import { airDensity, heatFlux, heatIntensity, burnStep, reentryAltitude, reentrySpeed, DURATION_S, patchMaterial } from '../../src/engine/reentry.js';

const fails = [], check = (c, m) => { console.log((c ? 'ok   ' : 'ÉCHEC ') + m); if (!c) fails.push(m); };
check(Math.abs(airDensity(0) - 1.225) < 1e-9 && airDensity(10) < airDensity(5) && airDensity(100) < 1e-5 && airDensity(150) < airDensity(100) && airDensity(80) > airDensity(100), 'densité de l’air : 1,225 kg/m³ au sol, décroissante (' + airDensity(100).toExponential(1) + ' à 100 km)');
check(heatIntensity(400, 7.7) === 0 && heatIntensity(120, 7.6) < 0.05 && heatIntensity(60, 7.6) > 0.95, 'chaleur : nulle en orbite, naissante à 120 km, maximale vers 60 km (' + heatIntensity(60, 7.6).toFixed(2) + ')');
check(heatIntensity(80, 7.6) > heatIntensity(80, 3), 'à altitude égale, plus vite = plus chaud (ρ·v³)');
// profil mis en scène depuis 420 km à 7,66 km/s : la chaleur monte puis le freinage la fait retomber ; l'objet est détruit
let burn = 0, tDead = null, maxHeat = 0, hAtMax = 0, prevAlt = 1e9, mono = true;
for (let t = 0; t <= DURATION_S; t += 0.1) { const alt = reentryAltitude(420, t), spd = reentrySpeed(7.66, alt), h = heatIntensity(alt, spd); if (alt > prevAlt + 1e-9) mono = false; prevAlt = alt; if (h > maxHeat) { maxHeat = h; hAtMax = alt; } burn = burnStep(burn, h, 0.1); if (burn >= 1 && tDead === null) tDead = t; }
check(mono && reentryAltitude(420, 0) === 420 && reentryAltitude(420, DURATION_S) === 0, 'altitude : de 420 km à 0 en ' + DURATION_S + ' s, toujours décroissante');
check(maxHeat > 0.9 && hAtMax > 40 && hAtMax < 100, 'chaleur maximale ' + maxHeat.toFixed(2) + ' vers ' + hAtMax.toFixed(0) + ' km');
check(tDead !== null && tDead > 40 && tDead < 85, 'l’objet est entièrement désintégré à t = ' + (tDead && tDead.toFixed(1)) + ' s');
check(burnStep(0, 0, 10) === 0 && burnStep(0.99, 1, 100) === 1, 'sans chaleur rien ne brûle ; la fraction brûlée est bornée à 1');
// shader : le matériau est patché (blocs écartés + liseré), sa clé de cache est propre, la restauration marche
const u = { uReBurn: { value: 0.5 }, uReCell: { value: 1 }, uReHeat: { value: 0.3 }, uReInv: { value: new THREE.Matrix4() } };
const m = new THREE.MeshStandardMaterial(), restore = patchMaterial(m, u);
const sh = { uniforms: {}, vertexShader: 'void main() {\n#include <begin_vertex>\n}', fragmentShader: 'void main() {\n#include <dithering_fragment>\n}' };
m.onBeforeCompile(sh, null);
check(sh.fragmentShader.includes('discard') && sh.fragmentShader.includes('reHash(floor(vReL / uReCell)) < uReBurn') && sh.vertexShader.includes('vReL = (uReInv') && 'uReBurn' in sh.uniforms && m.customProgramCacheKey().includes('reentry'), 'matériau modifié : blocs brûlés écartés (discard), liseré incandescent, clé de cache propre');
restore(); check(!m.customProgramCacheKey().includes('reentry') && typeof m.onBeforeCompile === 'function', 'restauré après la rentrée');
if (fails.length) { console.log(fails.length + ' échec(s)'); process.exit(1); }
