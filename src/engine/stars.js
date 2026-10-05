// Le VRAI ciel étoilé : ≈ 5 000 étoiles (magnitude ≤ 6) à leur vraie position (ascension droite / déclinaison J2000), avec leur couleur (B−V) et leur éclat (magnitude).
// Repère : le même que celui de la scène en vues « inertielles » : l'axe x = le point vernal, y = le pôle nord de la Terre, donc une étoile (α, δ) est en ll(α, δ) ; le moteur fait tourner le groupe avec le temps sidéral.
import * as THREE from 'three';
import { roundPointsMaterial } from './round-points.js';
import { STARS } from './data/stars.js';

// vecteur unitaire de l'étoile (mêmes axes que ll() de earth.js : x vers α = 0, y nord, z vers α = 270°)
export function starVector(raDeg, decDeg, out) {
  const a = raDeg * Math.PI / 180, d = decDeg * Math.PI / 180;
  return out.set(Math.cos(d) * Math.cos(a), Math.sin(d), -Math.cos(d) * Math.sin(a));
}

// couleur approchée d'après l'indice B−V : bleu-blanc (négatif) → blanc → jaune → orange → rouge (> 1,5)
const RAMP = [[-0.3, [0.6, 0.72, 1]], [0, [0.78, 0.85, 1]], [0.4, [1, 0.97, 0.92]], [0.8, [1, 0.88, 0.7]], [1.2, [1, 0.75, 0.5]], [1.8, [1, 0.6, 0.4]]];
export function bvColor(bv) {
  const v = Math.max(RAMP[0][0], Math.min(RAMP[RAMP.length - 1][0], bv));
  let i = 0; while (i < RAMP.length - 2 && v > RAMP[i + 1][0]) i++;
  const [b0, c0] = RAMP[i], [b1, c1] = RAMP[i + 1], t = (v - b0) / (b1 - b0);
  return c0.map((c, k) => c + (c1[k] - c) * t);
}

// classes d'éclat : taille (pixels) et luminosité d'une étoile d'après sa magnitude (plus c'est petit, plus c'est brillant)
export const STAR_BINS = [
  { max: 1.5, size: 5.2, light: 1 },
  { max: 2.5, size: 4, light: 1 },
  { max: 3.5, size: 3, light: 0.95 },
  { max: 4.5, size: 2.3, light: 0.85 },
  { max: 5.5, size: 1.7, light: 0.7 },
  { max: 99, size: 1.3, light: 0.55 },
];
export const starBin = mag => STAR_BINS.findIndex(b => mag < b.max);

// SCINTILLEMENT LENT (vue depuis un observatoire seulement) : la luminosité de chaque étoile oscille doucement (une période de 4 à 15 s environ : 0,4 à 1,6 rad/s, phase et fréquence propres à chaque étoile) de ± amp ; fonction pure de l'instant
export const TWINKLE_MIN_RAD_S = 0.2, TWINKLE_MAX_RAD_S = 0.6;
export const TWINKLE_SHARE = 0.2;   // seule UNE étoile sur CINQ scintille (les autres restent fixes)
export const twinkles = k => (((k * 2246822519 + 3266489917) >>> 0) % 1000) / 1000 < TWINKLE_SHARE;   // choix déterministe de l'étoile d'indice k dans sa classe d'éclat
export const twinkleFactor = (timeS, phase, freq, amp) => 1 + amp * Math.sin(timeS * freq + phase) * (0.85 + 0.15 * Math.sin(timeS * freq * 0.37 + phase * 1.7));

// DISPARITION AU LEVER / COUCHER : à mesure que le jour se lève (day de 0 à 1) les étoiles s'éteignent PEU À PEU, les plus faibles d'abord (les plus brillantes, comme Sirius ou Vénus, restent visibles jusqu'au jour franc)
export const STAR_FADE_LIMITS = [0.9, 0.8, 0.65, 0.5, 0.38, 0.28];   // par classe d'éclat : valeur de `day` à laquelle la classe a complètement disparu
export const starOpacity = (bin, day) => Math.max(0, Math.min(1, 1 - day / STAR_FADE_LIMITS[Math.min(bin, STAR_FADE_LIMITS.length - 1)]));

// groupe de points (une classe d'éclat = un objet Points : PointsMaterial n'a qu'une taille) de rayon 1, à replacer sur la caméra et agrandir à chaque image
export function createStars(scene) {
  const group = new THREE.Group(), tmp = new THREE.Vector3(), bins = STAR_BINS.map(() => []), tw = [];   // tw : une entrée par classe d'éclat { attr, base, phase, freq }
  for (const [ra, dec, mag, bv] of STARS) { const b = starBin(mag); starVector(ra, dec, tmp); const c = bvColor(bv), l = STAR_BINS[b].light; bins[b].push(tmp.x, tmp.y, tmp.z, c[0] * l, c[1] * l, c[2] * l); }
  bins.forEach((arr, i) => {
    const n = arr.length / 6, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) { pos.set(arr.slice(6 * k, 6 * k + 3), 3 * k); col.set(arr.slice(6 * k + 3, 6 * k + 6), 3 * k); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const colA = new THREE.BufferAttribute(col, 3); g.setAttribute('color', colA);
    const phase = new Float32Array(n), freq = new Float32Array(n); for (let k = 0; k < n; k++) { phase[k] = ((k * 2654435761) % 6283) / 1000; freq[k] = TWINKLE_MIN_RAD_S + (((k * 40503) % 1000) / 1000) * (TWINKLE_MAX_RAD_S - TWINKLE_MIN_RAD_S); }   // graines fixes : reproductible
    const sel = new Uint8Array(n); for (let k = 0; k < n; k++) sel[k] = twinkles(k) ? 1 : 0;
    tw.push({ attr: colA, base: col.slice(), phase, freq, sel });
    const p = new THREE.Points(g, roundPointsMaterial({ size: STAR_BINS[i].size, sizeAttenuation: false, vertexColors: true, depthWrite: false, transparent: true })); p.userData.bin = i; p.frustumCulled = false; group.add(p);
  });
  group.frustumCulled = false; scene.add(group);
  group.userData.twinkle = (timeS, amp) => {   // amp = 0 : étoiles fixes ; ≈ 0,12 : le scintillement lent de la nuit
    for (const t of tw) { const a = t.attr.array, n = t.phase.length; for (let k = 0; k < n; k++) { const f = amp > 0 && t.sel[k] ? twinkleFactor(timeS, t.phase[k], t.freq[k], amp) : 1; a[3 * k] = t.base[3 * k] * f; a[3 * k + 1] = t.base[3 * k + 1] * f; a[3 * k + 2] = t.base[3 * k + 2] * f; } t.attr.needsUpdate = true; }
  };
  group.userData.setDay = (day, dim = 1) => { for (const p of group.children) { if (p.userData.bin === undefined) continue; p.material.opacity = starOpacity(p.userData.bin, day) * dim; p.visible = p.material.opacity > 0.003; } };   // day : 0 = nuit (toutes les étoiles), 1 = plein jour (aucune) ; dim : luminosité globale (0,5 depuis un observatoire : étoiles deux fois moins lumineuses)
  return group;
}
