// Halo bleu de l'atmosphère sur l'horizon (le « flou bleu » du limbe de la Terre vue de l'espace).
// Une coque un peu plus grande que la Terre, dessinée de l'INTÉRIEUR (faces arrière) en additif : pour chaque pixel on calcule la distance b du centre de la Terre au rayon de vue ;
// entre le sol (b = 1) et le haut de la coque (b = ATM_R) le halo est fort au ras du sol et s'éteint en douceur. Les rayons qui touchent la Terre sont cachés par la Terre (test de profondeur).
// Marche aussi quand la caméra est dans la coque (à 200 km d'altitude on voit le halo à l'horizon). Aucune dépendance au Soleil : halo régulier tout autour.
import * as THREE from 'three';

export const ATM_R = 1.02;               // haut de la coque, en rayons terrestres (≈ 130 km : halo fin ; c'était 1,055 ≈ 350 km, jugé trop épais)
export const ATM_COLOR = [0.32, 0.6, 1.0];
export const ATM_POWER = 2.2;            // plus c'est grand, plus le halo est serré contre le sol

const VERT = `
varying vec3 vWorld;
varying vec3 vCenter;
#include <common>
#include <logdepthbuf_pars_vertex>
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vCenter = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
  #include <logdepthbuf_vertex>
}`;
const FRAG = `
uniform float uR;
uniform float uRatm;
uniform float uPower;
uniform vec3 uColor;
varying vec3 vWorld;
varying vec3 vCenter;
#include <common>
#include <logdepthbuf_pars_fragment>
void main() {
  #include <logdepthbuf_fragment>
  vec3 ray = normalize(vWorld - cameraPosition);
  float b = length(cross(ray, cameraPosition - vCenter));   // distance du centre de la Terre au rayon de vue
  float h = clamp((b - uR) / (uRatm - uR), 0.0, 1.0);        // 0 au ras du sol, 1 en haut de l'atmosphère
  float a = pow(1.0 - h, uPower);
  gl_FragColor = vec4(uColor, a * 0.95);
}`;

export function buildAtmosphere() {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uR: { value: 1.0 }, uRatm: { value: ATM_R }, uPower: { value: ATM_POWER }, uColor: { value: new THREE.Vector3(...ATM_COLOR) } },
    vertexShader: VERT, fragmentShader: FRAG, side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(ATM_R, 64, 32), mat);
  mesh.renderOrder = 4; mesh.frustumCulled = false; mesh.name = 'atmosphere';
  return mesh;
}
