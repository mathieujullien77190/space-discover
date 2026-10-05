// Couche « plan » (type Google Maps / Mapbox) de la Terre : charge les tuiles Web Mercator autour du point regardé et les pose sur la sphère comme des rustines
// (même principe que les photos aériennes de earth.js : rayon PATCH_R, au-dessus du maillage de la Terre). Réseau nécessaire (http seulement) ; sans réseau la carte dessinée reste.
import * as THREE from 'three';
import { PATCH_R, ll } from './earth.js';
import { MAP_HYSTERESIS, MAP_STYLES, mapMaxAlt, mapTiles, mapZoom, mercY, tileBounds, tileUrl } from './map-tiles.js';

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

export function createMapLayer(parent, renderer) {
  const group = new THREE.Group(); group.visible = false; parent.add(group);
  const tiles = new Map(); let style = 'street', template = MAP_STYLES.street.url;   // key → { mesh, state: 'loading' | 'ready' | 'error', t }
  let loading = 0, tick = 0, enabled = false;
  const setStyle = st => { if (!MAP_STYLES[st] || st === style) return; style = st; template = MAP_STYLES[st].url; for (const [k, t] of [...tiles]) free(k, t); };   // changement de style : on repart de zéro
  const free = (key, t) => { if (t.mesh) { group.remove(t.mesh); if (t.mesh.material.map) t.mesh.material.map.dispose(); t.mesh.material.dispose(); t.mesh.geometry.dispose(); } t.dead = true; tiles.delete(key); };
  const load = (tl) => {
    const t = { state: 'loading', t: tick, mesh: null }; tiles.set(tl.key, t); loading++;
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => {
      loading--; if (t.dead) return;
      try {
        const tex = new THREE.Texture(img); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); tex.generateMipmaps = true; tex.needsUpdate = true;
        const b = tileBounds(tl.x, tl.y, tl.z), seg = Math.max(2, Math.min(96, Math.ceil((b[1] - b[0]) / 0.2)));   // facettes ≤ 0,2° : le plan reste au-dessus du maillage de la Terre
        t.mesh = new THREE.Mesh(mapTileGeometry(b, seg, Math.max(2, Math.min(96, Math.ceil((b[3] - b[2]) / 0.2)))), new THREE.MeshLambertMaterial({ map: tex }));
        t.mesh.renderOrder = -2; group.add(t.mesh); t.state = 'ready';
      } catch (e) { t.state = 'error'; }
    };
    img.onerror = () => { loading--; t.state = 'error'; };
    img.src = tileUrl(tl.z, tl.x, tl.y, template);
  };
  return {
    group, setStyle,
    // à chaque image : on = couche demandée ; camAlt (km), cl / co = latitude / longitude sous la caméra (°), fov (°), aspect ; renvoie vrai quand le plan est affiché
    update({ on, style: st, camAlt, cl, co, fov, aspect, http }) {
      if (st) setStyle(st);
      const lim = mapMaxAlt(style) * (enabled ? MAP_HYSTERESIS : 1);   // seuil d'affichage (hystérésis : pas de clignotement)
      enabled = !!on && !!http && camAlt < lim;
      if (!enabled) { group.visible = false; if (!on || camAlt > 3000) for (const [k, t] of [...tiles]) free(k, t); return false; }
      tick++;
      const z = Math.min(mapZoom(camAlt, cl, fov, aspect), MAP_STYLES[style].zMax), want = mapTiles(co, cl, z);
      for (const tl of want) { const t = tiles.get(tl.key); if (t) t.t = tick; else if (loading < MAX_LOADING) load(tl); }
      if (tiles.size > MAX_CACHED) for (const [k, t] of [...tiles].sort((a, b) => a[1].t - b[1].t)) { if (tiles.size <= MAX_CACHED) break; if (t.t !== tick) free(k, t); }
      const wantKeys = new Set(want.map(t => t.key));
      for (const [k, t] of tiles) if (t.mesh) t.mesh.visible = wantKeys.has(k) || t.z === undefined;   // seules les tuiles du niveau courant sont affichées (pas de mélange de niveaux)
      group.visible = true;
      return [...tiles.values()].some(t => t.state === 'ready' && t.mesh && t.mesh.visible);
    },
    stats() { return { tiles: tiles.size, ready: [...tiles.values()].filter(t => t.state === 'ready').length, loading }; },
    dispose() { for (const [k, t] of [...tiles]) free(k, t); parent.remove(group); },
  };
}
