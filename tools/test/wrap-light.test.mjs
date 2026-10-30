// Éclairage enveloppant : le chunk Lambert de three.js est bien modifié (jour franc inchangé, pénombre élargie).
import * as THREE from 'three';
import { LAMBERT_LINE, WRAP, wrapLighting, wrappedChunk } from '../../src/engine/wrap-light.js';

const fails = [], check = (c, m) => { console.log((c ? 'ok   ' : 'ÉCHEC ') + m); if (!c) fails.push(m); };
check(THREE.ShaderChunk.lights_lambert_pars_fragment.includes(LAMBERT_LINE), 'la ligne Lambert de three.js existe encore (mise à jour de three à surveiller)');
const chunk = wrappedChunk();
check(chunk !== THREE.ShaderChunk.lights_lambert_pars_fragment && !chunk.includes(LAMBERT_LINE) && chunk.includes('), ' + WRAP.toFixed(3) + ' )'), 'le chunk est modifié (exposant p = ' + WRAP + ')');
const irr = (d, p = WRAP) => Math.pow(Math.max(0, Math.min(1, d)), p);
check(irr(1) === 1, 'Soleil au zénith : éclairage plein (inchangé)');
check(irr(0) === 0 && irr(-0.2) === 0 && irr(0.1) > 0.3 && irr(0.1) < irr(0.5), 'au terminateur : exactement moitié-moitié (zéro à N·L = 0), montée rapide ensuite');
const m = wrapLighting(new THREE.MeshLambertMaterial()), sh = { uniforms: {}, vertexShader: 'void main() {\n#include <project_vertex>\n}', fragmentShader: '#include <lights_lambert_pars_fragment>' };
m.onBeforeCompile(sh);
check(sh.fragmentShader.includes(chunk.replace('vec3 irradiance = dotNL * directLight.color;', 'vec3 irradiance = dotNL * directLight.color * eclVis(vEclW);')) && sh.fragmentShader.includes('eclVis') && sh.vertexShader.includes('vEclW = ') && 'uEclSun' in sh.uniforms && m.customProgramCacheKey().startsWith('wrap'), 'matériau modifié au premier rendu (enveloppe + ombre des astres), avec sa propre clé de cache');
if (fails.length) { console.log(fails.length + ' échec(s)'); process.exit(1); }
