// Couche « relief + imagerie satellite » de la Terre : autour du point regardé, des tuiles Web Mercator sont posées sur la sphère ; chacune est DÉFORMÉE avec les altitudes réelles (Terrarium) et habillée de l'image satellite (Esri World Imagery).
// Visible sous TERRAIN_MAX_ALT_KM ; au-dessus (ou hors ligne) la carte dessinée de la Terre reste. Réseau nécessaire (http seulement). Mêmes principes que les photos aériennes de earth.js (rayon proche de 1, au-dessus du maillage de la Terre).
import * as THREE from 'three';
import { ll } from './earth.js';
import { DEM_URL, IMAGERY_URL, SEA_LEVEL_OFFSET, TERRAIN_EXAGGERATION, TERRAIN_GLOW, TERRAIN_HYSTERESIS, TERRAIN_MAX_ALT_KM, mercY, terrainTiles, terrainFallbacks, terrainLevels, tileBounds, tileHeights, tileUrl, vertexRadius } from './terrain-tiles.js';

const MAX_CACHED = 320;   // tuiles gardées en mémoire (≈ 320 × (image 350 Ko + relief) de mémoire graphique) : les plus anciennes sont libérées
const MAX_LOADING = 16;   // images en cours de téléchargement
export const TILE_SEGMENTS = 32;   // facettes par côté d'une tuile
export const FAR_SEGMENTS = 12;    // facettes par côté d'une tuile LOINTAINE (sans relief)
export const SKIRT = 6e-4;         // jupe sous les bords d'une tuile (≈ 4 km) : cache les fissures entre tuiles voisines de relief différent

// géométrie d'une tuile : grille régulière en longitude / latitude, rayon = niveau de la mer + altitude exagérée, V de la texture en ordonnée Mercator ;
// un anneau de sommets supplémentaires (la « jupe ») double les bords, abaissés de SKIRT. heights = (nx + 1) × (ny + 1) altitudes en mètres (lignes du nord au sud).
export function terrainTileGeometry(b, nx, ny, heights, exag) {
  const [w, e, s, n] = b, cols = nx + 3, rows = ny + 3, pos = new Float32Array(cols * rows * 3), uv = new Float32Array(cols * rows * 2), idx = [], v = new THREE.Vector3(), my0 = mercY(s), my1 = mercY(n);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const ci = Math.max(0, Math.min(nx, i - 1)), cj = Math.max(0, Math.min(ny, j - 1)), skirt = i === 0 || j === 0 || i === cols - 1 || j === rows - 1;
    const lat = n - (n - s) * cj / ny, k = j * cols + i, r = vertexRadius(heights[cj * (nx + 1) + ci], exag) - (skirt ? SKIRT : 0);
    ll(w + (e - w) * ci / nx, lat, v);
    pos.set([v.x * r, v.y * r, v.z * r], 3 * k); uv.set([ci / nx, (mercY(lat) - my0) / (my1 - my0)], 2 * k);
  }
  for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) { const a = j * cols + i, b2 = a + 1, c = a + cols, d = c + 1; idx.push(a, c, b2, b2, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

export function createTerrainLayer(parent, renderer, opts) {
  const group = new THREE.Group(); group.visible = false; parent.add(group);
  const tiles = new Map(), exag = (opts && opts.exaggeration) || TERRAIN_EXAGGERATION;   // key → { state: 'loading' | 'ready' | 'error', t, mesh, img, dem }
  let loading = 0, tick = 0, enabled = false, lastLevels = 0;
  const free = (key, t) => { if (t.mesh) { group.remove(t.mesh); if (t.mesh.material.map) t.mesh.material.map.dispose(); t.mesh.material.dispose(); t.mesh.geometry.dispose(); } t.dead = true; tiles.delete(key); };
  const build = (tl, t) => {   // imagerie ET relief reçus : on construit la tuile
    try {
      const b = tileBounds(tl.x, tl.y, tl.z), seg = tl.dem ? TILE_SEGMENTS : FAR_SEGMENTS; let heights;
      if (tl.dem) { const w = t.dem.naturalWidth || 256, h = t.dem.naturalHeight || 256, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.drawImage(t.dem, 0, 0, w, h); heights = tileHeights(g.getImageData(0, 0, w, h).data, w, h, seg, seg, b); }
      else heights = new Float32Array((seg + 1) * (seg + 1));   // tuiles lointaines : image seulement, niveau de la mer (le relief n'y serait pas visible)
      const tex = new THREE.Texture(t.img); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); tex.needsUpdate = true;
      t.mesh = new THREE.Mesh(terrainTileGeometry(b, seg, seg, heights, exag), new THREE.MeshLambertMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: TERRAIN_GLOW }));
      t.mesh.renderOrder = -2 - (tl.k || 0); group.add(t.mesh); t.state = 'ready'; t.img = t.dem = null;
    } catch (e) { t.state = 'error'; }
  };
  const fetchImage = (url, onload, t) => {
    const img = new Image(); img.crossOrigin = 'anonymous'; loading++;
    img.onload = () => { loading--; if (!t.dead) onload(img); };
    img.onerror = () => { loading--; t.state = 'error'; };
    img.src = url;
  };
  const load = tl => {
    const t = { state: 'loading', t: tick, mesh: null, img: null, dem: null, demWanted: !!tl.dem }; tiles.set(tl.key, t);
    const done = () => { if (t.img && (t.dem || !tl.dem) && !t.dead && t.state === 'loading') build(tl, t); };
    fetchImage(tileUrl(tl.z, tl.x, tl.y, IMAGERY_URL), img => { t.img = img; done(); }, t);
    if (tl.dem) fetchImage(tileUrl(tl.z, tl.x, tl.y, DEM_URL), img => { t.dem = img; done(); }, t);   // le relief n'est chargé que pour le niveau le plus fin
  };
  return {
    group,
    // à chaque image : on = couche demandée ; camAlt (km), cl / co = latitude / longitude du point regardé (°), fov (°), aspect ; renvoie vrai quand le relief est affiché
    update({ on, camAlt, cl, co, fov, aspect, http }) {
      const lim = TERRAIN_MAX_ALT_KM * (enabled ? TERRAIN_HYSTERESIS : 1);   // seuil d'affichage (hystérésis : pas de clignotement)
      enabled = !!on && !!http && camAlt < lim;
      if (!enabled) { group.visible = false; if (!on || camAlt > 3000) for (const [k, t] of [...tiles]) free(k, t); return false; }
      tick++;
      const levels = terrainLevels(co, cl, camAlt, fov, aspect), want = []; lastLevels = levels.length;
      levels.forEach(lv => lv.tiles.forEach(tl => want.push(Object.assign({}, tl, { k: lv.k, dem: lv.dem }))));   // niveaux emboîtés jusqu'à l'horizon
      for (const tl of want) { const t = tiles.get(tl.key); if (t && tl.dem && !t.demWanted) { free(tl.key, t); if (loading < MAX_LOADING) load(tl); } else if (t) t.t = tick; else if (loading < MAX_LOADING) load(tl); }   // (une tuile de secours à plat devenue tuile fine est rechargée avec son relief)
      const fb = terrainFallbacks(want, key => { const t = tiles.get(key); return !!t && t.state === 'ready'; });   // tuile pas encore arrivée : sa parente (un cran moins détaillé) la remplace en attendant
      for (const tl of fb) { const t = tiles.get(tl.key); if (t) t.t = tick; else if (loading < MAX_LOADING) load(tl); }
      if (tiles.size > MAX_CACHED) for (const [k, t] of [...tiles].sort((a, b) => a[1].t - b[1].t)) { if (tiles.size <= MAX_CACHED) break; if (t.t !== tick) free(k, t); }
      const wantKeys = new Set(want.concat(fb).map(t => t.key));
      for (const [k, t] of tiles) if (t.mesh) t.mesh.visible = wantKeys.has(k);   // seules les tuiles du niveau courant sont affichées (pas de mélange de niveaux)
      group.visible = true;
      return [...tiles.values()].some(t => t.state === 'ready' && t.mesh && t.mesh.visible);
    },
    stats() { return { levels: lastLevels, tiles: tiles.size, ready: [...tiles.values()].filter(t => t.state === 'ready').length, loading, seaOffset: SEA_LEVEL_OFFSET }; },
    dispose() { for (const [k, t] of [...tiles]) free(k, t); parent.remove(group); },
  };
}
