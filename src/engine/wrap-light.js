// ÉCLAIRAGE « ENVELOPPANT » (wrap lighting) : le passage de la lumière à l'ombre au terminateur est ÉLARGI (demande : « le sol devient trop vite sombre, fais la zone entre obscur et pas obscur plus grande »).
// three.js éclaire en Lambert : irradiance = max(0, N·L), nulle dès que le Soleil est sous l'horizon du point. On la remplace par (N·L + w) / (1 + w) bornée à [0, 1] :
// le jour franc (N·L = 1) est inchangé, la lumière s'éteint progressivement de N·L = +w à N·L = −w (Soleil de ≈ +20° à ≈ −20° de hauteur pour w = 0,35) au lieu de s'éteindre pile à l'horizon.
import * as THREE from 'three';
import { eclipseShader } from './eclipse.js';

export const WRAP = 0.35;
export const LAMBERT_LINE = 'float dotNL = saturate( dot( geometryNormal, directLight.direction ) );';
export const wrappedChunk = (w = WRAP) => THREE.ShaderChunk.lights_lambert_pars_fragment.replace(LAMBERT_LINE, 'float dotNL = saturate( ( dot( geometryNormal, directLight.direction ) + ' + w.toFixed(3) + ' ) / ' + (1 + w).toFixed(3) + ' );');

// applique l'éclairage enveloppant à un matériau Lambert (modifie le shader au premier rendu ; clé de cache propre pour ne pas se mélanger aux autres Lambert)
export function wrapLighting(material, w = WRAP) {
  const chunk = wrappedChunk(w);
  material.onBeforeCompile = shader => eclipseShader(shader, 'lights_lambert_pars_fragment', chunk);   // + ombre des autres astres sur ce matériau (éclipses : voir eclipse.js)
  material.customProgramCacheKey = () => 'wrap' + w + 'ecl';
  return material;
}
