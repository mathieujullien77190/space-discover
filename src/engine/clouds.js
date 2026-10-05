// Couverture nuageuse (quasi temps réel) : carte mondiale des nuages (infrarouge de satellites géostationnaires, mise à jour toutes les 3 h) du service gratuit https://clouds.matteason.co.uk/ ;
// image équirectangulaire en niveaux de gris (blanc = nuage) utilisée comme canal de transparence d'une fine sphère blanche posée juste au-dessus de la Terre (≈ 10 km).
// SERVICE EN LIGNE tiers : il faut citer le crédit (CLOUDS_CREDIT) et respecter ses règles d'usage ; sans réseau (ou hors http) la couche reste vide.
import * as THREE from 'three';
import { wrapLighting } from './wrap-light.js';
import { earthGeometry } from './earth.js';

export const CLOUDS_URL = { low: 'https://clouds.matteason.co.uk/images/2048x1024/clouds.jpg', high: 'https://clouds.matteason.co.uk/images/4096x2048/clouds.jpg' };
export const CLOUDS_CREDIT = 'Nuages : clouds.matteason.co.uk (images satellites géostationnaires)';
export const CLOUDS_R = 1.0015;            // rayon de la couche (≈ 10 km d'altitude) en rayons terrestres
export const CLOUDS_REFRESH_MS = 3 * 3600e3;   // l'image est renouvelée toutes les 3 heures
export const CLOUDS_HIGH_ALT_KM = 4000;    // sous cette altitude on charge l'image 4096 × 2048 (1,6 Mo) au lieu de 2048 × 1024
export const CLOUDS_FADE_KM = [15, 40];    // la couche s'efface quand la caméra descend dans les nuages (opacité nulle sous 15 km, pleine à 40 km)

// opacité de la couche selon l'altitude de la caméra : on ne traverse pas les nuages à l'écran
export const cloudsOpacity = altKm => Math.max(0, Math.min(1, (altKm - CLOUDS_FADE_KM[0]) / (CLOUDS_FADE_KM[1] - CLOUDS_FADE_KM[0]))) * 0.92;

export function createClouds(parent, renderer, now = () => Date.now()) {
  const geo = earthGeometry(256, 128);
  const mat = wrapLighting(new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
  const mesh = new THREE.Mesh(geo, mat); mesh.scale.setScalar(CLOUDS_R); mesh.renderOrder = 3; mesh.visible = false; parent.add(mesh);
  let state = null, level = null, stamp = 0, tex = null;   // state : null | 'loading' | 'ready' | 'error'
  const fetchMap = (lvl) => {
    state = 'loading'; level = lvl; stamp = Math.floor(now() / CLOUDS_REFRESH_MS);
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const t = new THREE.Texture(img); t.colorSpace = THREE.NoColorSpace; t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); t.needsUpdate = true;
        if (tex) tex.dispose(); tex = t; mat.alphaMap = t; mat.needsUpdate = true; state = 'ready';
      } catch (e) { state = 'error'; }
    };
    img.onerror = () => { state = 'error'; };
    img.src = CLOUDS_URL[lvl] + '?t=' + stamp;   // le paramètre force le renouvellement après 3 h
  };
  return {
    mesh,
    // à chaque image : on = couche demandée, camAlt (km), http = chargement autorisé
    update({ on, camAlt, http }) {
      if (!on || !http) { mesh.visible = false; return false; }
      const want = camAlt < CLOUDS_HIGH_ALT_KM ? 'high' : 'low';
      if (state !== 'loading' && (state === null || (state !== 'error' && (level !== want && want === 'high' || Math.floor(now() / CLOUDS_REFRESH_MS) !== stamp)))) fetchMap(want);
      mat.opacity = state === 'ready' ? cloudsOpacity(camAlt) : 0;
      mesh.visible = state === 'ready' && mat.opacity > 0.01;
      return mesh.visible;
    },
    stats() { return { state, level, stamp, visible: mesh.visible, opacity: mat.opacity }; },
    dispose() { parent.remove(mesh); geo.dispose(); mat.dispose(); if (tex) tex.dispose(); },
  };
}
