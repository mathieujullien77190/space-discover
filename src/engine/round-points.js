// POINTS RONDS : par défaut un `THREE.Points` est un CARRÉ. On le dessine avec un petit disque doux (texture d'alpha 64 × 64 générée par programme, partagée) :
// étoiles, étoile en surbrillance, étoiles filantes, avions, points lointains des astres, repères de l'ISS / de Hubble / des observatoires.
import * as THREE from 'three';

export const ROUND_SIZE = 64;
// alpha d'un pixel du disque : plein jusqu'à 55 % du rayon, puis descente douce jusqu'au bord (rayon 1)
export const roundAlpha = r => (r >= 1 ? 0 : r <= 0.55 ? 1 : (() => { const t = (1 - r) / 0.45; return t * t * (3 - 2 * t); })());

let tex = null;
export function roundTexture() {
  if (tex) return tex;
  const n = ROUND_SIZE, data = new Uint8Array(n * n * 4);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const r = Math.hypot((i + 0.5) / n * 2 - 1, (j + 0.5) / n * 2 - 1), o = (j * n + i) * 4;
    data[o] = data[o + 1] = data[o + 2] = 255; data[o + 3] = Math.round(255 * roundAlpha(r));
  }
  tex = new THREE.DataTexture(data, n, n, THREE.RGBAFormat); tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false; tex.needsUpdate = true;
  return tex;
}

// matériau de points ronds : mêmes options que THREE.PointsMaterial (couleur, taille, mélange, opacité…) + la texture de disque
export const roundPointsMaterial = (opts = {}) => new THREE.PointsMaterial({ transparent: true, ...opts, map: roundTexture(), alphaTest: 0.02 });
