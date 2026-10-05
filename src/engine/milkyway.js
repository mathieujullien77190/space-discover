// VOIE LACTÉE (vue depuis un observatoire, en pleine nuit) : 20 000 petites étoiles de fond semées selon le VRAI contour de la Voie lactée
// (cinq niveaux de luminosité du relevé d3-celestial, BSD-3 : tools/make-milkyway.mjs → data/milkyway-points.js). Pas de lueur floue : seulement des points,
// de luminosités très variées (beaucoup de très faibles, quelques-unes plus brillantes), environ trois fois moins lumineux que les étoiles du catalogue.
// Les positions sont des étoiles tirées au hasard DANS le vrai contour : ce n'est pas un relevé étoile par étoile.
// Fondue avec la hauteur du Soleil : absente tant qu'il fait même un peu jour, pleine seulement quand le Soleil est à plus de 18° sous l'horizon.
import * as THREE from 'three';
import { MILKY_POINTS_B64, MILKY_POINTS_N } from './data/milkyway-points.js';
import { starVector } from './stars.js';

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

export const MILKY_DIM = 1 / 3;        // luminosité globale des points : trois fois moins que les étoiles du catalogue
export const MILKY_LUM_POWER = 2.2;    // la luminosité tirée (0–1) est élevée à cette puissance : la grande majorité des points est très faible, peu sont brillants
export const MILKY_BRIGHT_MIN = 0.3;   // au-delà (après la puissance), un point est « brillant » (un peu plus gros)

const gauss = x => Math.exp(-x * x);

// décode les points de fond : positions (vecteurs unitaires de la scène), luminosité 0–1 (après la puissance) et couleur (blanc bleuté → jaune vers le centre galactique)
export function milkyWayStars() {
  const bin = Uint8Array.from(atob(MILKY_POINTS_B64), c => c.charCodeAt(0)), n = MILKY_POINTS_N;   // atob : navigateur et Node ≥ 16
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), lum = new Float32Array(n), v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const o = i * 5, ra = (bin[o] | (bin[o + 1] << 8)) / 65536 * 360, dec = (bin[o + 2] | (bin[o + 3] << 8)) / 65535 * 180 - 90, b = Math.pow(bin[o + 4] / 255, MILKY_LUM_POWER);
    starVector(ra, dec, v); pos[3 * i] = v.x; pos[3 * i + 1] = v.y; pos[3 * i + 2] = v.z; lum[i] = b;
    const e = [v.x, -v.z, v.y], g = GALACTIC_FROM_EQUATORIAL.map(r => r[0] * e[0] + r[1] * e[1] + r[2] * e[2]), l = Math.atan2(g[1], g[0]) * 180 / Math.PI;
    const warm = Math.min(1, gauss(l / 55) * 0.85 + ((i * 2654435761) % 1000) / 1000 * 0.25);   // centre jaune, ailleurs plutôt blanc-bleu
    const k = 0.25 + 0.75 * b;   // la plupart sont très ternes (mais encore visibles)
    col[3 * i] = k * (0.80 + 0.20 * warm); col[3 * i + 1] = k * (0.88 - 0.04 * warm); col[3 * i + 2] = k * (1.0 - 0.38 * warm);
  }
  return { n, pos, col, lum };
}

export function createMilkyWay(starsGroup) {
  const { n, pos, col, lum } = milkyWayStars(), faint = [], bright = [];
  for (let i = 0; i < n; i++) (lum[i] > MILKY_BRIGHT_MIN ? bright : faint).push(i);
  const mk = (idx, px) => {
    const g = new THREE.BufferGeometry(), p = new Float32Array(idx.length * 3), c = new Float32Array(idx.length * 3);
    idx.forEach((i, j) => { p.set(pos.subarray(3 * i, 3 * i + 3), 3 * j); c.set(col.subarray(3 * i, 3 * i + 3), 3 * j); });
    g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    const m = new THREE.PointsMaterial({ size: px, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const pts = new THREE.Points(g, m); pts.renderOrder = -1; pts.frustumCulled = false; pts.visible = false; starsGroup.add(pts); return pts;
  };
  const parts = [mk(faint, 1.2), mk(bright, 2)];   // faibles : 1,2 px ; plus lumineux : 2 px
  return {
    points: parts, count: n, brightCount: bright.length,
    // opacity 0 à MILKY_MAX_OPACITY ; invisibles quand elle est nulle ; × MILKY_DIM : trois fois moins lumineux que les étoiles du catalogue
    update(opacity) { const a = Math.min(1, opacity / MILKY_MAX_OPACITY) * 0.9 * MILKY_DIM; for (const p of parts) { p.material.opacity = a; p.visible = opacity > 0.01; } },
    visible: () => parts.some(p => p.visible),
    opacity: () => parts[0].material.opacity,
    dispose() { starsGroup.remove(...parts); for (const p of parts) { p.geometry.dispose(); p.material.dispose(); } },
  };
}
