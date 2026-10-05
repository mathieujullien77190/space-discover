// Terre en RELIEF avec imagerie satellite (équivalent libre du « 3D satellite » de Mapbox) : mathématiques PURES des tuiles Web Mercator (z/x/y), décodage des altitudes et choix du niveau de zoom.
// Données (toutes gratuites, sans clé, avec CORS ouvert) :
//   imagerie  : Esri « World Imagery » (crédit obligatoire), photo satellite ; niveau 15 au plus ici
//   altitudes : AWS Terrain Tiles « Terrarium » (SRTM, GMTED, USGS 3DEP, GEBCO…) : altitude en mètres = R·256 + G + B/256 − 32768 ; niveau 15 au plus
// SERVICES EN LIGNE tiers : il faut citer les crédits (TERRAIN_CREDIT) et respecter leurs règles d'usage (usage raisonnable).
export const IMAGERY_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
export const DEM_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
export const TERRAIN_CREDIT = 'Imagerie : Esri, Maxar, Earthstar Geographics, USDA, USGS… · Altitudes : AWS Terrain Tiles (SRTM, GMTED, USGS 3DEP, GEBCO)';
export const TERRAIN_Z_MIN = 3, TERRAIN_Z_MAX = 14;   // niveaux de zoom utilisés (14 ≈ 10 m par pixel d'image)
export const TERRAIN_RADIUS = 3;                       // grille de (2 × 3 + 1)² = 49 tuiles autour du point regardé
export const TERRAIN_MAX_ALT_KM = 1000;                // au-dessus : la carte dessinée de la Terre reste affichée (fondu entre 900 et 1 000 km : tuiles pleinement visibles à 900 km)
export const TERRAIN_HYSTERESIS = 1.12;                // une fois affiché, le relief ne disparaît qu'à 12 % au-dessus du seuil
export const TERRAIN_EXAGGERATION = 2;                 // relief exagéré ×2 (à 6 378 km de rayon, l'Everest ne fait que 0,14 % : invisible sinon)
export const TERRAIN_OPACITY = 0.85;                   // opacité maximale des tuiles : la carte dessinée (claire) transparaît dessous et ÉCLAIRCIT l'imagerie satellite (souvent sombre)
export const TERRAIN_GLOW = 0.3;                       // lumière propre ajoutée à l'imagerie (relève les ombres du relief : la face à l'ombre du Soleil n'est plus noire)
export const TERRAIN_FADE_START = 0.9;                 // le fondu démarre à 900 km (90 % de 1 000 km) : l'imagerie apparaît en douceur au lieu de surgir
export const EARTH_R_M = 6378137;
export const SEA_LEVEL_OFFSET = 8e-6;                  // le niveau de la mer des tuiles est ≈ 50 m au-dessus du maillage de la Terre (dont les facettes plongent jusqu'à 30 m sous la sphère)
const R2D = 180 / Math.PI, EARTH_CIRC_KM = 40075.017;

export const tileUrl = (z, x, y, template) => template.replace('{z}', z).replace('{x}', x).replace('{y}', y);
export const tilesAt = z => Math.pow(2, z);
export const tileLon = (x, z) => (x / tilesAt(z)) * 360 - 180;                                                    // longitude (°) du bord gauche de la colonne x
export const tileLat = (y, z) => Math.atan(Math.sinh(Math.PI * (1 - 2 * y / tilesAt(z)))) * R2D;                   // latitude (°) du bord supérieur de la ligne y
export const tileBounds = (x, y, z) => [tileLon(x, z), tileLon(x + 1, z), tileLat(y + 1, z), tileLat(y, z)];       // [lonOuest, lonEst, latSud, latNord]

// tuile qui contient (lon, lat) au niveau z
export function tileAt(lon, lat, z) {
  const n = tilesAt(z), la = Math.max(-85.0511, Math.min(85.0511, lat)) / R2D;
  const x = Math.floor(((lon + 180) / 360) * n), y = Math.floor(((1 - Math.log(Math.tan(la) + 1 / Math.cos(la)) / Math.PI) / 2) * n);
  return { x: ((x % n) + n) % n, y: Math.max(0, Math.min(n - 1, y)), z };
}

// ordonnée Mercator (sans unité) d'une latitude : une image de tuile est linéaire en cette ordonnée
export const mercY = lat => Math.log(Math.tan(Math.PI / 4 + Math.max(-85.0511, Math.min(85.0511, lat)) / R2D / 2));

// niveau de zoom adapté à l'altitude de la caméra : la grille doit couvrir ce que voit l'écran (1 tuile ≈ 1/6 de la largeur vue : image nette)
export function terrainZoom(altKm, latDeg, fovDeg, aspect) {
  const span = 2 * Math.max(0.05, altKm) * Math.tan(fovDeg * Math.PI / 360) * Math.max(1, aspect || 1.6), tileKm = span / 6;
  const z = Math.log2(EARTH_CIRC_KM * Math.max(0.05, Math.cos(latDeg / R2D)) / tileKm);
  return Math.max(TERRAIN_Z_MIN, Math.min(TERRAIN_Z_MAX, Math.round(z)));
}

// tuiles à charger autour de (lon, lat) : grille carrée (colonnes bouclées autour du globe, lignes limitées aux pôles de la projection), les plus proches du centre d'abord
export function terrainTiles(lon, lat, z, radius = TERRAIN_RADIUS) {
  const c = tileAt(lon, lat, z), n = tilesAt(z), out = [];
  for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
    const y = c.y + dy; if (y < 0 || y >= n) continue;
    const x = (((c.x + dx) % n) + n) % n;
    if (n <= 2 * radius + 1 && out.some(t => t.x === x && t.y === y)) continue;   // petit niveau de zoom : pas de doublons quand la grille fait le tour du globe
    out.push({ x, y, z, key: z + '/' + x + '/' + y, d: Math.hypot(dx, dy) });
  }
  return out.sort((a, b) => a.d - b.d);
}

// altitude en mètres d'un pixel Terrarium
export const terrariumElevation = (r, g, b) => r * 256 + g + b / 256 - 32768;

// altitude (m) en (u, v) ∈ [0, 1]² d'une tuile Terrarium (u vers l'est, v vers le SUD, comme l'image) : interpolation bilinéaire des pixels RGBA
export function sampleDem(rgba, w, h, u, v) {
  const x = Math.max(0, Math.min(w - 1, u * (w - 1))), y = Math.max(0, Math.min(h - 1, v * (h - 1))), x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(w - 1, x0 + 1), y1 = Math.min(h - 1, y0 + 1), fx = x - x0, fy = y - y0;
  const e = (px, py) => { const i = 4 * (py * w + px); return terrariumElevation(rgba[i], rgba[i + 1], rgba[i + 2]); };
  return (e(x0, y0) * (1 - fx) + e(x1, y0) * fx) * (1 - fy) + (e(x0, y1) * (1 - fx) + e(x1, y1) * fx) * fy;
}

// altitudes d'une grille (nx + 1) × (ny + 1) de sommets régulière en LONGITUDE / LATITUDE couvrant une tuile (lignes du nord au sud) : Float32Array en mètres, mers ramenées à 0 (la mer reste plate) ;
// bounds = [lonO, lonE, latS, latN] : l'image Terrarium est régulière en ordonnée Mercator, donc la ligne de pixels d'un sommet se déduit de sa latitude (sans bounds : lignes régulières)
export function tileHeights(rgba, w, h, nx, ny, bounds) {
  const out = new Float32Array((nx + 1) * (ny + 1)), m0 = bounds ? mercY(bounds[3]) : 0, m1 = bounds ? mercY(bounds[2]) : 0;
  for (let j = 0; j <= ny; j++) {
    const v = bounds ? (m0 - mercY(bounds[3] - (bounds[3] - bounds[2]) * j / ny)) / (m0 - m1) : j / ny;
    for (let i = 0; i <= nx; i++) out[j * (nx + 1) + i] = Math.max(0, sampleDem(rgba, w, h, i / nx, v));
  }
  return out;
}

// rayon d'un sommet (rayons terrestres) : niveau de la mer (un souffle au-dessus du maillage de la Terre) + altitude exagérée
export const vertexRadius = (elevM, exag = TERRAIN_EXAGGERATION) => 1 + SEA_LEVEL_OFFSET + Math.max(0, elevM) * exag / EARTH_R_M;

// opacité des tuiles selon l'altitude de la caméra : 0 au seuil (TERRAIN_MAX_ALT_KM), pleine (TERRAIN_OPACITY) sous TERRAIN_FADE_START × seuil, fondu progressif entre les deux
export function terrainOpacity(altKm) {
  const hi = TERRAIN_MAX_ALT_KM, lo = hi * TERRAIN_FADE_START, t = Math.max(0, Math.min(1, (hi - altKm) / (hi - lo)));
  return TERRAIN_OPACITY * t * t * (3 - 2 * t);   // marche lissée
}
