// Éclairage enveloppant : le chunk Lambert de three.js est bien modifié (jour franc inchangé, pénombre élargie).
import * as THREE from 'three';
import { LAMBERT_LINE, WRAP, SHIFT, wrapLighting, wrappedChunk } from '../../src/engine/wrap-light.js';

const fails = [], check = (c, m) => { console.log((c ? 'ok   ' : 'ÉCHEC ') + m); if (!c) fails.push(m); };
check(THREE.ShaderChunk.lights_lambert_pars_fragment.includes(LAMBERT_LINE), 'la ligne Lambert de three.js existe encore (mise à jour de three à surveiller)');
const chunk = wrappedChunk();
check(chunk !== THREE.ShaderChunk.lights_lambert_pars_fragment && !chunk.includes(LAMBERT_LINE) && chunk.includes('smoothstep( ' + (SHIFT - WRAP).toFixed(3)), 'le chunk est modifié (fondu ±w, w = ' + WRAP + ')');
const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const irr = (d, w = WRAP) => ss(SHIFT - w, SHIFT + w, d) * (0.5 + 0.5 * Math.max(0, Math.min(1, d)));
check(irr(1) === 1, 'Soleil au zénith : éclairage plein (inchangé)');
check(irr(SHIFT - WRAP) === 0 && irr(SHIFT) > irr(SHIFT - WRAP * 0.5) && irr(SHIFT - WRAP * 0.5) > 0 && irr(0) < irr(SHIFT), 'fondu doux et symétrique autour du terminateur (éteint à N·L = −w, Soleil ≈ ' + (Math.asin(WRAP) * 180 / Math.PI).toFixed(0) + '° sous l’horizon)');
const m = wrapLighting(new THREE.MeshLambertMaterial()), sh = { uniforms: {}, vertexShader: 'void main() {\n#include <project_vertex>\n}', fragmentShader: '#include <lights_lambert_pars_fragment>' };
m.onBeforeCompile(sh);
check(sh.fragmentShader.includes(chunk.replace('vec3 irradiance = dotNL * directLight.color;', 'vec3 irradiance = dotNL * directLight.color * eclVis(vEclW);')) && sh.fragmentShader.includes('eclVis') && sh.vertexShader.includes('vEclW = ') && 'uEclSun' in sh.uniforms && m.customProgramCacheKey().startsWith('wrap'), 'matériau modifié au premier rendu (enveloppe + ombre des astres), avec sa propre clé de cache');
if (fails.length) { console.log(fails.length + ' échec(s)'); process.exit(1); }
