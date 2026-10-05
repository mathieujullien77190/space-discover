// VOIE LACTÉE (vue depuis un observatoire, en pleine nuit) : une bande diffuse le long du plan galactique, dessinée par programme (pas de photo) :
//  - plan galactique réel (pôle nord galactique à α = 192,86°, δ = +27,13° ; centre galactique à α = 266,40°, δ = −28,94°), donc bien placée parmi les vraies étoiles ;
//  - lueur plus brillante et plus large vers le centre (Sagittaire, bulbe), plus faible et bleutée vers l'anticentre ; nuages d'étoiles (bruit fractal) ;
//  - bandes de poussière sombres (la « Grande Faille » du Cygne à Antarès) ;
// fondue avec la hauteur du Soleil : absente tant qu'il fait même un peu jour, pleine seulement quand le Soleil est à plus de 18° sous l'horizon.
// Le dessin est un peu stylisé : ce n'est pas la vraie répartition de la lumière (pas de nébuleuses nommées, pas de Nuages de Magellan).
import * as THREE from 'three';

// matrice équatorial J2000 → galactique (IAU 1958 / Hipparcos), lignes
export const GALACTIC_FROM_EQUATORIAL = [
  [-0.0548755604, -0.8734370902, -0.4838350155],
  [0.4941094279, -0.4448296300, 0.7469822445],
  [-0.8676661490, -0.1980763734, 0.4559837762],
];
export const GALACTIC_CENTER = { ra: 266.405, dec: -28.936 }, GALACTIC_POLE = { ra: 192.859, dec: 27.128 };

// opacité de la Voie lactée selon le sinus de la hauteur du Soleil : 0 au-dessus de −11,5° (se = −0,20), pleine sous −18,6° (se = −0,32), lissée
export const MILKY_FADE = [-0.2, -0.32];
export const MILKY_MAX_OPACITY = 0.6;
export const milkyWayOpacity = se => { const t = Math.max(0, Math.min(1, (se - MILKY_FADE[0]) / (MILKY_FADE[1] - MILKY_FADE[0]))); return t * t * (3 - 2 * t) * MILKY_MAX_OPACITY; };

// bruit de valeur 3D (déterministe) et fractal
const hash = (x, y, z) => { let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
const fade = t => t * t * (3 - 2 * t);
export function noise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi);
  const l = (a, b, t) => a + (b - a) * t;
  return l(l(l(hash(xi, yi, zi), hash(xi + 1, yi, zi), xf), l(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), xf), yf), l(l(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), xf), l(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), xf), yf), zf);
}
export const fbm = (x, y, z, oct = 4) => { let a = 0.5, f = 1, s = 0, n = 0; for (let i = 0; i < oct; i++) { s += a * noise3(x * f, y * f, z * f); n += a; a *= 0.5; f *= 2; } return s / n; };

const gauss = x => Math.exp(-x * x), gauss2 = (a, b) => Math.exp(-(a * a + b * b));
const smoothstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// couleur [r, g, b] (0 à 1) de la Voie lactée dans la direction galactique unitaire (gx, gy, gz) : x vers le centre galactique, z vers le pôle nord galactique
export function milkyWayPixel(gx, gy, gz) {
  const b = Math.asin(Math.max(-1, Math.min(1, gz))) * 180 / Math.PI, l = Math.atan2(gy, gx) * 180 / Math.PI;   // latitude, longitude galactiques (°)
  const core = gauss(l / 60);                                                    // 1 vers le centre galactique, → 0 vers l'anticentre
  const wide = gauss(b / (8 + 5 * core)) * (0.30 + 0.70 * core);                  // large halo de la bande, plus épais vers le centre
  const thin = gauss(b / 2.8) * (0.25 + 0.55 * core);                             // plan mince et brillant
  const bulge = gauss2(l / 11, b / 8) * 0.9;                             // bulbe du centre
  const clouds = 0.35 + 1.15 * fbm(gx * 4 + 3.1, gy * 4 - 1.7, gz * 4 + 5.3, 4);            // nuages d'étoiles
  let v = (wide + thin + bulge) * clouds;
  const lane = smoothstep(0.52, 0.68, fbm(gx * 9 - 4.4, gy * 9 + 2.2, gz * 9 + 7.7, 3));      // poussière : filaments sombres le long du plan
  const rift = gauss(b / 3.2) * (0.35 + 0.65 * smoothstep(-35, 5, l) * smoothstep(75, 30, l));   // surtout entre l ≈ −30° et 70° (la Grande Faille)
  v *= 1 - 0.85 * lane * rift;
  const warm = gauss(l / 45) * gauss(b / 12);                          // centre jaune-orangé, bras bleutés
  const r = v * (0.62 + 0.38 * warm), g = v * (0.72 + 0.20 * warm), bl = v * (0.95 - 0.30 * warm);
  return [Math.min(1, r * 0.6), Math.min(1, g * 0.6), Math.min(1, bl * 0.6)];   // × 0,6 : la lumière diffuse reste douce (le mélange est additif)
}

// texture RGBA (Uint8Array) w × h, correspondance des pixels = celle de THREE.SphereGeometry (u autour de y, v du pôle y vers le pôle −y) ; le repère local est tourné vers le galactique par `localToGalactic`
export const localToGalactic = (x, y, z) => [x, -z, y];   // rotation propre : y local = pôle nord galactique
export function paintMilkyWay(w, h) {
  const out = new Uint8Array(w * h * 4);
  for (let j = 0; j < h; j++) {
    const th = (j + 0.5) / h * Math.PI, st = Math.sin(th), ct = Math.cos(th);
    for (let i = 0; i < w; i++) {
      const ph = (i + 0.5) / w * 2 * Math.PI, [gx, gy, gz] = localToGalactic(-Math.cos(ph) * st, ct, Math.sin(ph) * st), c = milkyWayPixel(gx, gy, gz), o = (j * w + i) * 4;
      out[o] = c[0] * 255; out[o + 1] = c[1] * 255; out[o + 2] = c[2] * 255; out[o + 3] = 255;
    }
  }
  return out;
}

// maillage : sphère intérieure de rayon 0,985 (juste sous les étoiles) dans le groupe d'étoiles ; orientation = repère de la scène ← équatorial ← galactique ← local
export function milkyWayQuaternion(out = new THREE.Quaternion()) {
  const A = GALACTIC_FROM_EQUATORIAL, M = new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1);   // équatorial (X, Y, Z) → scène (X, Z, −Y)
  const At = new THREE.Matrix4().set(A[0][0], A[1][0], A[2][0], 0, A[0][1], A[1][1], A[2][1], 0, A[0][2], A[1][2], A[2][2], 0, 0, 0, 0, 1);   // galactique → équatorial
  const R = new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1);                                          // local → galactique : g = (x, −z, y)
  return out.setFromRotationMatrix(new THREE.Matrix4().multiplyMatrices(M, At).multiply(R));
}

export function createMilkyWay(starsGroup, size = [1024, 512]) {
  const tex = new THREE.DataTexture(paintMilkyWay(size[0], size[1]), size[0], size[1], THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.RepeatWrapping; tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true;
  const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.985, 64, 32), mat); mesh.renderOrder = -1; mesh.frustumCulled = false; mesh.visible = false;
  milkyWayQuaternion(mesh.quaternion); starsGroup.add(mesh);
  return {
    mesh,
    // opacity 0 à MILKY_MAX_OPACITY ; invisible quand elle est nulle
    update(opacity) { mat.opacity = opacity; mesh.visible = opacity > 0.01; },
    dispose() { starsGroup.remove(mesh); mesh.geometry.dispose(); mat.dispose(); tex.dispose(); },
  };
}
