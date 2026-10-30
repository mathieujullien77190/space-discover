// ÉCLAIRAGE DU TERMINATEUR : moitié éclairée / moitié sombre, passage net (demandes : « le sol devient trop vite sombre » puis « la nuit doit arriver plus vite, ça devrait être moitié-moitié mais le passage est flou »).
// three.js éclaire en Lambert : irradiance = max(0, N·L), qui monte lentement depuis l'horizon (floue, car proportionnelle au sinus de la hauteur du Soleil). On la remplace par max(0, N·L)^p, p < 1 :
// nulle exactement au terminateur (N·L = 0, donc exactement moitié-moitié, sans pénombre côté nuit), mais qui monte vite (p = 0,4 : 40 % à N·L = 0,1 soit ≈ 6° de hauteur) ; le jour franc (N·L = 1) est inchangé.
import * as THREE from 'three';
import { eclipseShader } from './eclipse.js';

export const WRAP = 0.4;   // exposant p
export const LAMBERT_LINE = 'float dotNL = saturate( dot( geometryNormal, directLight.direction ) );';
export const wrappedChunk = (w = WRAP) => THREE.ShaderChunk.lights_lambert_pars_fragment.replace(LAMBERT_LINE, 'float dotNL = pow( saturate( dot( geometryNormal, directLight.direction ) ), ' + w.toFixed(3) + ' );');

// applique l'éclairage enveloppant à un matériau Lambert (modifie le shader au premier rendu ; clé de cache propre pour ne pas se mélanger aux autres Lambert)
export function wrapLighting(material, w = WRAP) {
  const chunk = wrappedChunk(w);
  material.onBeforeCompile = shader => eclipseShader(shader, 'lights_lambert_pars_fragment', chunk);   // + ombre des autres astres sur ce matériau (éclipses : voir eclipse.js)
  material.customProgramCacheKey = () => 'wrap' + w + 'ecl';
  return material;
}
