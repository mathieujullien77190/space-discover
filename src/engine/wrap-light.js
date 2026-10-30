// ÉCLAIRAGE DU TERMINATEUR : moitié éclairée / moitié sombre, passage DOUX conservé (demandes : « le sol devient trop vite sombre », puis « moitié-moitié mais flou », puis « il faut garder le flou »).
// three.js éclaire en Lambert : irradiance = max(0, N·L). On la remplace par smoothstep(−w, +w, N·L) × (0,5 + 0,5·N·L) : fondu SYMÉTRIQUE autour du terminateur (milieu du fondu pile à N·L = 0, donc la moitié exacte du globe),
// large de ±w (w = 0,25 : Soleil de ≈ +14° à ≈ −14°) ; le jour franc (N·L = 1) est inchangé et le relief garde son ombrage.
import * as THREE from 'three';
import { eclipseShader } from './eclipse.js';

export const WRAP = 0.25;   // demi-largeur du fondu (en N·L)
export const LAMBERT_LINE = 'float dotNL = saturate( dot( geometryNormal, directLight.direction ) );';
export const wrappedChunk = (w = WRAP) => THREE.ShaderChunk.lights_lambert_pars_fragment.replace(LAMBERT_LINE, 'float dotNL = smoothstep( -' + w.toFixed(3) + ', ' + w.toFixed(3) + ', dot( geometryNormal, directLight.direction ) ) * ( 0.5 + 0.5 * saturate( dot( geometryNormal, directLight.direction ) ) );');

// applique l'éclairage enveloppant à un matériau Lambert (modifie le shader au premier rendu ; clé de cache propre pour ne pas se mélanger aux autres Lambert)
export function wrapLighting(material, w = WRAP) {
  const chunk = wrappedChunk(w);
  material.onBeforeCompile = shader => eclipseShader(shader, 'lights_lambert_pars_fragment', chunk);   // + ombre des autres astres sur ce matériau (éclipses : voir eclipse.js)
  material.customProgramCacheKey = () => 'wrap' + w + 'ecl';
  return material;
}
