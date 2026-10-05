// Couche « plan » (type Google Maps / Mapbox) de la Terre : charge les tuiles Web Mercator autour du point regardé et les pose sur la sphère comme des rustines
// (même principe que les photos aériennes de earth.js : rayon PATCH_R, au-dessus du maillage de la Terre). Réseau nécessaire (http seulement) ; sans réseau la carte dessinée reste.
import * as THREE from 'three';
import { paintContours } from './contours.js';
import { PATCH_R, ll } from './earth.js';
import { FRANCE_BOX, MAP_HYSTERESIS, MAP_STYLES, mapMaxAlt, mapTiles, mapZoom, mercY, tileBounds, tileInBox, tileUrl } from './map-tiles.js';

const MAX_CACHED = 140;   // tuiles gardées en mémoire (≈ 140 × 350 Ko de GPU) : les plus anciennes sont libérées
const MAX_LOADING = 8;    // téléchargements simultanés

// géométrie d'une tuile : lon/lat régulières, mais V de la texture en ordonnée Mercator (la tuile est une image Web Mercator)
export function mapTileGeometry(b, nx, ny) {
  const [w, e, s, n] = b, pos = new Float32Array((nx + 1) * (ny + 1) * 3), nor = new Float32Array(pos.length), uv = new Float32Array((nx + 1) * (ny + 1) * 2), idx = [], v = new THREE.Vector3();
  const my0 = mercY(s), my1 = mercY(n);
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const k = j * (nx + 1) + i, lat = n - (n - s) * j / ny;
    ll(w + (e - w) * i / nx, lat, v);
    nor.set([v.x, v.y, v.z], 3 * k); pos.set([v.x * PATCH_R, v.y * PATCH_R, v.z * PATCH_R], 3 * k);
    uv.set([i / nx, (mercY(lat) - my0) / (my1 - my0)], 2 * k);
  }
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b2 = a + 1, c = a + nx + 1, d = c + 1; idx.push(a, c, b2, b2, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
  return g;
}

// Deux jeux de tuiles superposés : « base » (carte physique peinte, sans noms, niveau 8 au plus) PARTOUT, et « contours » (courbes de niveau tous les 100 m, une couleur par courbe, niveau 12 au plus) SEULEMENT sur la France, par-dessus.
// Les deux sont dessinés au même rayon : le jeu dessiné en dernier (renderOrder plus grand) gagne, donc les courbes recouvrent la carte physique.
export function createMapLayer(parent, renderer) {
  const group = new THREE.Group(); group.visible = false; parent.add(group);
  let loading = 0, tick = 0, enabled = false;
  const makeSet = (style, order, filter) => {
    const tiles = new Map(), cfg = MAP_STYLES[style];   // key → { mesh, state: 'loading' | 'ready' | 'error', t }
    const free = (key, t) => { if (t.mesh) { group.remove(t.mesh); if (t.mesh.material.map) t.mesh.material.map.dispose(); t.mesh.material.dispose(); t.mesh.geometry.dispose(); } t.dead = true; tiles.delete(key); };
    const load = (tl) => {
      const t = { state: 'loading', t: tick, mesh: null }; tiles.set(tl.key, t); loading++;
      const img = new Image(); img.crossOrigin = 'anonymous';
      img.onload = () => {
        loading--; if (t.dead) return;
        try {
          let tex;
          const b = tileBounds(tl.x, tl.y, tl.z);
          if (cfg.kind === 'elevation') {   // tuile d'altitude : on peint les courbes de niveau colorées dans un canvas
            const w = img.naturalWidth || 256, h = img.naturalHeight || 256, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
            const d = g.getImageData(0, 0, w, h), mpp = 40075017 * Math.cos((b[2] + b[3]) / 2 * Math.PI / 180) / (w * Math.pow(2, tl.z));
            d.data.set(paintContours(d.data, w, h, mpp)); g.putImageData(d, 0, 0); tex = new THREE.CanvasTexture(c);
          } else tex = new THREE.Texture(img);
          tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); tex.generateMipmaps = true; tex.needsUpdate = true;
          const seg = Math.max(2, Math.min(96, Math.ceil((b[1] - b[0]) / 0.2)));   // facettes ≤ 0,2° : la carte reste au-dessus du maillage de la Terre
          t.mesh = new THREE.Mesh(mapTileGeometry(b, seg, Math.max(2, Math.min(96, Math.ceil((b[3] - b[2]) / 0.2)))), new THREE.MeshLambertMaterial({ map: tex }));
          t.mesh.renderOrder = order; group.add(t.mesh); t.state = 'ready';
        } catch (e) { t.state = 'error'; }
      };
      img.onerror = () => { loading--; t.state = 'error'; };
      img.src = tileUrl(tl.z, tl.x, tl.y, cfg.url);
    };
    return {
      cfg, tiles,
      update(camAlt, cl, co, fov, aspect) {
        const z = Math.min(mapZoom(camAlt, cl, fov, aspect), cfg.zMax), want = mapTiles(co, cl, z).filter(tl => !filter || filter(tl));
        for (const tl of want) { const t = tiles.get(tl.key); if (t) t.t = tick; else if (loading < MAX_LOADING) load(tl); }
        if (tiles.size > MAX_CACHED) for (const [k, t] of [...tiles].sort((a, b) => a[1].t - b[1].t)) { if (tiles.size <= MAX_CACHED) break; if (t.t !== tick) free(k, t); }
        const wantKeys = new Set(want.map(t => t.key));
        for (const [k, t] of tiles) if (t.mesh) t.mesh.visible = wantKeys.has(k);   // seules les tuiles du niveau courant sont affichées (pas de mélange de niveaux)
      },
      clear() { for (const [k, t] of [...tiles]) free(k, t); },
      ready() { return [...tiles.values()].some(t => t.state === 'ready' && t.mesh && t.mesh.visible); },
      stats() { return { tiles: tiles.size, ready: [...tiles.values()].filter(t => t.state === 'ready').length }; },
    };
  };
  const base = makeSet('clean', -2), cont = makeSet('contours', -1, tl => tileInBox(tl, FRANCE_BOX));
  return {
    group,
    // à chaque image : on = couche demandée ; camAlt (km), cl / co = latitude / longitude sous la caméra (°), fov (°), aspect ; renvoie vrai quand la carte détaillée est affichée
    update({ on, camAlt, cl, co, fov, aspect, http }) {
      const lim = mapMaxAlt('clean') * (enabled ? MAP_HYSTERESIS : 1);   // 400 km (hystérésis : pas de clignotement)
      enabled = !!on && !!http && camAlt < lim;
      if (!enabled) { group.visible = false; if (!on || camAlt > 3000) { base.clear(); cont.clear(); } return false; }
      tick++; base.update(camAlt, cl, co, fov, aspect); cont.update(camAlt, cl, co, fov, aspect);
      group.visible = true;
      return base.ready() || cont.ready();
    },
    stats() { const b = base.stats(), c = cont.stats(); return { tiles: b.tiles + c.tiles, ready: b.ready + c.ready, base: b.tiles, contours: c.tiles, loading }; },
    dispose() { base.clear(); cont.clear(); parent.remove(group); },
  };
}
