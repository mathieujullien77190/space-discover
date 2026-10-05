// Halo bleu de l'atmosphère sur l'horizon (le « flou bleu » du limbe de la Terre vue de l'espace).
// Une coque un peu plus grande que la Terre, dessinée de l'INTÉRIEUR (faces arrière) en additif : pour chaque pixel on calcule la distance b du centre de la Terre au rayon de vue ;
// entre le sol (b = 1) et le haut de la coque (b = ATM_R) le halo est fort au ras du sol et s'éteint en douceur. Les rayons qui touchent la Terre sont cachés par la Terre (test de profondeur).
// Marche aussi quand la caméra est dans la coque (au Pic du Midi, la coque EST le ciel).
// Dépend du SOLEIL (uSun, activé par uUseSun) : au point où le rayon frôle l'atmosphère (son point le plus bas, ou la caméra pour un rayon qui monte), la lumière est bleue si le Soleil est haut,
// ORANGE-ROUGE près de l'horizon quand il se couche ou se lève (surtout vers le Soleil), et NULLE la nuit (le ciel est alors transparent : on voit les étoiles).
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
uniform vec3 uSun;      // direction du Soleil depuis le centre de la Terre (unitaire)
uniform float uUseSun;  // 1 = tient compte du Soleil (mode jour / nuit), 0 = halo régulier
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
  vec3 col = uColor;
  if (uUseSun > 0.5) {
    vec3 oc = cameraPosition - vCenter;
    float tStar = max(0.0, -dot(ray, oc));                    // point le plus bas du rayon vers l'avant (la caméra si le rayon monte)
    vec3 n = normalize(oc + ray * tStar);                       // la verticale en ce point
    float s = dot(n, uSun);                                     // sinus de la hauteur du Soleil en ce point
    float lit = smoothstep(-0.22, 0.28, s);                     // jour : 1, nuit : 0 (transparent)
    float tw = exp(-pow((s - 0.02) / 0.16, 2.0));              // crépuscule : fort quand le Soleil est près de l'horizon
    vec3 up = normalize(oc);
    float e = dot(ray, up);                                     // hauteur du rayon au-dessus de l'horizon local
    vec3 rayH = ray - up * e, sunH = uSun - up * dot(uSun, up);
    float toSun = (length(rayH) > 1e-4 && length(sunH) > 1e-4) ? max(0.0, dot(normalize(rayH), normalize(sunH))) : 0.5;
    float horizon = 1.0 - smoothstep(0.0, 0.55, max(e, 0.0));   // plus fort près de l'horizon
    float orange = clamp(tw * horizon * (0.3 + 0.7 * toSun) * 1.6, 0.0, 1.0);
    col = mix(uColor, vec3(1.0, 0.46, 0.18), orange);
    a *= lit * mix(1.0, 0.85 + 0.3 * orange, orange);
  }
  gl_FragColor = vec4(col, a * 0.95);
}`;

export function buildAtmosphere() {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uR: { value: 1.0 }, uRatm: { value: ATM_R }, uPower: { value: ATM_POWER }, uColor: { value: new THREE.Vector3(...ATM_COLOR) }, uSun: { value: new THREE.Vector3(1, 0, 0) }, uUseSun: { value: 0 } },
    vertexShader: VERT, fragmentShader: FRAG, side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(ATM_R, 64, 32), mat);
  mesh.renderOrder = 4; mesh.frustumCulled = false; mesh.name = 'atmosphere';
  return mesh;
}
