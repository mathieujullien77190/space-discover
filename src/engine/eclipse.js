// OMBRES DES ASTRES LES UNS SUR LES AUTRES (éclipses de Soleil et de Lune, ombre d'une planète sur ses lunes, d'une lune sur sa planète) :
// pour chaque pixel d'un astre éclairé, on regarde quelle FRACTION DU DISQUE DU SOLEIL est cachée par chacun des astres proches (jusqu'à ECL_MAX), vus depuis ce point : c'est exactement la géométrie
// ombre (umbra) + pénombre : 0 = plein soleil, 1 = totalité. Calcul dans le shader (aire de recouvrement de deux disques de rayons angulaires rs et rc séparés de d), partagé par la Terre, ses nuages,
// le relief satellite et les sphères des autres astres (planètes, lunes). La version JavaScript (`sunVisibility`) sert aux tests et à assombrir le ciel / l'éclat du Soleil vu d'un observatoire.
import * as THREE from 'three';

export const ECL_MAX = 6;   // nombre maximal d'occulteurs pris en compte (les plus proches de la caméra)
export const ECL = {        // uniformes PARTAGÉS par tous les matériaux récepteurs (positions dans le repère MONDE de la scène, rayons en rayons terrestres)
  uEclSun: { value: new THREE.Vector4(0, 0, 0, 109) },
  uEclOcc: { value: Array.from({ length: ECL_MAX }, () => new THREE.Vector4(0, 0, 0, 0)) },
  uEclN: { value: 0 },
};

// fraction (0–1) du disque du Soleil (rayon angulaire rs) cachée par un disque de rayon angulaire rc dont le centre en est éloigné de d (radians)
export function coveredFraction(rs, rc, d) {
  if (d >= rs + rc) return 0;
  if (d <= Math.abs(rc - rs)) return rc >= rs ? 1 : (rc * rc) / (rs * rs);
  const a1 = Math.acos(Math.max(-1, Math.min(1, (d * d + rs * rs - rc * rc) / (2 * d * rs)))), a2 = Math.acos(Math.max(-1, Math.min(1, (d * d + rc * rc - rs * rs) / (2 * d * rc))));
  return (rs * rs * (a1 - Math.sin(2 * a1) / 2) + rc * rc * (a2 - Math.sin(2 * a2) / 2)) / (Math.PI * rs * rs);
}

// éclairement relatif du point P (0 = ombre totale, 1 = plein soleil) : sun = { x, y, z, r }, occluders = [{ x, y, z, r }] ; un occulteur sur lequel P se trouve (|P − C| < 1,02 r) est ignoré
export function sunVisibility(P, sun, occluders) {
  const ds = [sun.x - P.x, sun.y - P.y, sun.z - P.z], Ds = Math.hypot(...ds), rs = Math.asin(Math.min(1, sun.r / Ds));
  let vis = 1;
  for (const o of occluders) {
    const dc = [o.x - P.x, o.y - P.y, o.z - P.z], Dc = Math.hypot(...dc);
    if (Dc < o.r * 1.02 || Dc < 1e-9) continue;
    const dot = dc[0] * ds[0] + dc[1] * ds[1] + dc[2] * ds[2]; if (dot <= 0) continue;
    const cx = dc[1] * ds[2] - dc[2] * ds[1], cy = dc[2] * ds[0] - dc[0] * ds[2], cz = dc[0] * ds[1] - dc[1] * ds[0];
    vis *= 1 - coveredFraction(rs, Math.asin(Math.min(1, o.r / Dc)), Math.atan2(Math.hypot(cx, cy, cz), dot));
  }
  return vis;
}

// ---------- shaders (même calcul) ----------
export const ECL_VERT_PARS = 'varying vec3 vEclW;\n';
export const ECL_VERT_BODY = '\nvEclW = (modelMatrix * vec4(transformed, 1.0)).xyz;';   // après #include <project_vertex> : `transformed` existe
export const ECL_FRAG_PARS = `
varying vec3 vEclW;
uniform vec4 uEclSun;
uniform vec4 uEclOcc[${ECL_MAX}];
uniform float uEclN;
float eclCovered(float rs, float rc, float d) {
  if (d >= rs + rc) return 0.0;
  if (d <= abs(rc - rs)) return rc >= rs ? 1.0 : (rc * rc) / (rs * rs);
  float a1 = acos(clamp((d * d + rs * rs - rc * rc) / (2.0 * d * rs), -1.0, 1.0));
  float a2 = acos(clamp((d * d + rc * rc - rs * rs) / (2.0 * d * rc), -1.0, 1.0));
  return (rs * rs * (a1 - sin(2.0 * a1) * 0.5) + rc * rc * (a2 - sin(2.0 * a2) * 0.5)) / (3.14159265 * rs * rs);
}
float eclVis(vec3 P) {
  vec3 ds = uEclSun.xyz - P; float Ds = length(ds); float rs = asin(min(1.0, uEclSun.w / Ds));
  float vis = 1.0;
  for (int i = 0; i < ${ECL_MAX}; i++) {
    if (float(i) >= uEclN) break;
    vec3 dc = uEclOcc[i].xyz - P; float Dc = length(dc); float ro = uEclOcc[i].w;
    if (Dc < ro * 1.02 || Dc < 1e-7) continue;
    float dt = dot(dc, ds); if (dt <= 0.0) continue;
    float d = atan(length(cross(dc, ds)), dt);   // angle entre les deux centres (atan : précis même quand ils sont presque alignés)
    vis *= 1.0 - eclCovered(rs, asin(min(1.0, ro / Dc)), d);
  }
  return vis;
}
`;
export const IRR_LINE = 'vec3 irradiance = dotNL * directLight.color;';
export const IRR_ECL = 'vec3 irradiance = dotNL * directLight.color * eclVis(vEclW);';

// ajoute l'ombre des astres à un matériau (Lambert ou Standard) : `chunkName` = le chunk de lumière à modifier ; `chunk` = son texte (déjà modifié par ailleurs si besoin)
export function eclipseShader(shader, chunkName, chunk) {
  shader.uniforms.uEclSun = ECL.uEclSun; shader.uniforms.uEclOcc = ECL.uEclOcc; shader.uniforms.uEclN = ECL.uEclN;
  shader.vertexShader = shader.vertexShader.replace('void main() {', ECL_VERT_PARS + 'void main() {').replace('#include <project_vertex>', '#include <project_vertex>' + ECL_VERT_BODY);
  shader.fragmentShader = shader.fragmentShader.replace('#include <' + chunkName + '>', ECL_FRAG_PARS + chunk.replace(IRR_LINE, IRR_ECL));
}

// matériau Standard (planètes, lunes) récepteur d'ombres
export function eclipseStandard(material) {
  material.onBeforeCompile = shader => eclipseShader(shader, 'lights_physical_pars_fragment', THREE.ShaderChunk.lights_physical_pars_fragment);
  material.customProgramCacheKey = () => 'eclStd';
  return material;
}

// mise à jour à chaque image : sun = { x, y, z, r } et occluders (les plus proches d'abord) dans le repère MONDE (celui de vEclW)
export function setEclipse(sun, occluders) {
  ECL.uEclSun.value.set(sun.x, sun.y, sun.z, sun.r);
  const n = Math.min(ECL_MAX, occluders.length);
  for (let i = 0; i < n; i++) ECL.uEclOcc.value[i].set(occluders[i].x, occluders[i].y, occluders[i].z, occluders[i].r);
  ECL.uEclN.value = n;
}
