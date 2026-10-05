// PRÉCESSION DES ÉQUINOXES : le catalogue d'étoiles est donné pour l'an 2000 (J2000) ; l'axe de la Terre pivote en 26 000 ans (≈ 50,3″ par an), donc le point vernal sur lequel est calé le temps sidéral (celui « de la date »)
// s'est décalé de ≈ 0,36° depuis 2000. On tourne donc tout le ciel (étoiles, constellations) de la matrice de précession de J2000 vers la date (IAU 1976, Meeus, Astronomical Algorithms ch. 21).
// Repère de la scène : (x, y, z) = (X, Z, −Y) du repère équatorial (x vers le point vernal, y vers le pôle nord).
import * as THREE from 'three';

const ARCSEC = Math.PI / 180 / 3600;
// angles de précession (rad) pour T = siècles juliens depuis J2000
export const precessionAngles = T => ({
  zeta: (2306.2181 * T + 0.30188 * T * T + 0.017998 * T * T * T) * ARCSEC,
  z: (2306.2181 * T + 1.09468 * T * T + 0.018203 * T * T * T) * ARCSEC,
  theta: (2004.3109 * T - 0.42665 * T * T - 0.041833 * T * T * T) * ARCSEC,
});

// matrice 3 × 3 (THREE.Matrix4 sans translation) qui fait passer un vecteur équatorial J2000 à l'équateur et à l'équinoxe de la date : P = Rz(−z) · Ry(θ) · Rz(−ζ)
export function precessionMatrix(T, out = new THREE.Matrix4()) {
  const { zeta, z, theta } = precessionAngles(T);
  const cz = Math.cos(zeta), sz = Math.sin(zeta), cZ = Math.cos(z), sZ = Math.sin(z), ct = Math.cos(theta), st = Math.sin(theta);
  // éléments classiques (Meeus) : r_date = P · r_J2000
  return out.set(
    cZ * ct * cz - sZ * sz, -cZ * ct * sz - sZ * cz, -cZ * st, 0,
    sZ * ct * cz + cZ * sz, -sZ * ct * sz + cZ * cz, -sZ * st, 0,
    st * cz, -st * sz, ct, 0,
    0, 0, 0, 1);
}

// la même rotation exprimée dans les axes de la scène : S = M · P · M⁻¹ avec M : (X, Y, Z) → (X, Z, −Y)
const M = new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1), Minv = M.clone().invert();
export function precessionQuaternion(T, out = new THREE.Quaternion()) {
  const P = precessionMatrix(T), S = new THREE.Matrix4().multiplyMatrices(M, P).multiply(Minv);
  return out.setFromRotationMatrix(S);
}
