// Ombres des astres : fraction du disque du Soleil cachée (ombre + pénombre), éclipses de Soleil et de Lune.
import { coveredFraction, sunVisibility, ECL_MAX, eclipseShader, ECL_FRAG_PARS } from '../../src/engine/eclipse.js';

const fails = [], check = (c, m) => { console.log((c ? 'ok   ' : 'ÉCHEC ') + m); if (!c) fails.push(m); };
const rs = 0.0046;
check(coveredFraction(rs, 0.006, 0) === 1 && coveredFraction(rs, 0.003, 0) < 0.43 && coveredFraction(rs, 0.003, 0) > 0.42 && coveredFraction(rs, 0.004, 0.01) === 0, 'disques : recouvrement total (grand disque), annulaire (petit disque : (3/4,6)² = 0,425), nul (disjoints)');
let prev = 1, mono = true; for (let d = 0; d <= 0.0106; d += 0.0002) { const f = coveredFraction(rs, 0.006, d); if (f > prev + 1e-9) mono = false; prev = f; }
check(mono && coveredFraction(rs, 0.006, 0.0053) > 0.3 && coveredFraction(rs, 0.006, 0.0053) < 0.9, 'la fraction cachée décroît de façon continue de la totalité (d = 0) à 0 (pénombre, d = rs + rc)');
// Soleil à 23 455 rayons terrestres (r = 109,1), Lune de rayon 0,2725 à 60,3 (moyenne) ou 57 (périgée) ; point P à la surface de la Terre, du côté du Soleil (axe x)
const sun = { x: 23455, y: 0, z: 0, r: 109.1 }, P = { x: 1, y: 0, z: 0 };
const moonAt = (d, dy = 0) => ({ x: d, y: dy, z: 0, r: 0.2725 });
check(sunVisibility(P, sun, [moonAt(57)]) < 0.001, 'Lune au périgée pile devant le Soleil : ÉCLIPSE TOTALE (éclairement ' + sunVisibility(P, sun, [moonAt(57)]).toFixed(4) + ')');
const ann = sunVisibility(P, sun, [moonAt(63.5)]);
check(ann > 0.02 && ann < 0.15, 'Lune à l’apogée : éclipse ANNULAIRE (' + (100 * (1 - ann)).toFixed(1) + ' % du disque caché)');
const partial = sunVisibility(P, sun, [moonAt(57, 0.2)]);
check(partial > 0.2 && partial < 0.9, 'Lune décalée de ≈ 0,2° : éclipse PARTIELLE (' + partial.toFixed(2) + ')');
check(sunVisibility(P, sun, [moonAt(57, 5)]) === 1, 'Lune loin de la ligne de visée : plein soleil');
check(sunVisibility(P, sun, [{ x: -57, y: 0, z: 0, r: 0.2725 }]) === 1, 'Lune du côté opposé au Soleil : aucune ombre');
check(sunVisibility({ x: 57 - 0.2725, y: 0, z: 0 }, sun, [moonAt(57)]) === 1, 'un point sur l’occulteur lui-même ne s’ombre pas lui-même');
// ÉCLIPSE DE LUNE : point de la Lune (à 60,3 de la Terre, côté nuit) ; la Terre (r = 1) entre la Lune et le Soleil
const lunarP = { x: -60.3 + 0.2725, y: 0, z: 0 }, earthOcc = [{ x: 0, y: 0, z: 0, r: 1 }];
check(sunVisibility(lunarP, sun, earthOcc) < 0.001, 'Lune dans l’ombre de la Terre : ÉCLIPSE TOTALE DE LUNE');
check(sunVisibility({ x: -60.3 + 0.2725, y: 0.9, z: 0 }, sun, earthOcc) > 0.01 && sunVisibility({ x: -60.3 + 0.2725, y: 0.9, z: 0 }, sun, earthOcc) < 1, 'Lune au bord de l’ombre : pénombre (éclairement partiel)');
// plusieurs occulteurs : les ombres se multiplient
const two = sunVisibility(P, sun, [moonAt(57, 0.2), moonAt(30, 0.1)]);
check(two < partial, 'deux occulteurs : encore plus sombre (' + two.toFixed(2) + ' < ' + partial.toFixed(2) + ')');
// shader
const sh = { uniforms: {}, vertexShader: 'void main() {\n#include <project_vertex>\n}', fragmentShader: '#include <lights_physical_pars_fragment>' };
eclipseShader(sh, 'lights_physical_pars_fragment', 'void RE() { vec3 irradiance = dotNL * directLight.color; }');
check(sh.fragmentShader.includes('eclVis(vEclW)') && sh.fragmentShader.includes('uEclOcc[' + ECL_MAX + ']') && sh.vertexShader.includes('varying vec3 vEclW') && sh.vertexShader.includes('vEclW = (modelMatrix') && ECL_FRAG_PARS.includes('atan(length(cross('), 'shader : le facteur d’ombre multiplie l’irradiance directe (varying du point en repère monde + boucle sur ' + ECL_MAX + ' occulteurs)');
if (fails.length) { console.log(fails.length + ' échec(s)'); process.exit(1); }
