// Fond de carte « plan » (type Google Maps / Mapbox) : tuiles Web Mercator (« slippy map » z/x/y). Fonctions PURES (sans three.js), testées dans Node.
// CARTO « Voyager » (essayé d'abord) EXIGE maintenant une clé d'API (les tuiles affichent « API KEY REQUIRED ») : abandonné.
// Styles (tuiles SANS clé, avec CORS) : « street » = Esri « World Topographic Map » (vert clair, forêts, montagnes en relief ombré, lacs et mers bleus, routes, villes : le plus proche de Google Maps), « terrain » = OpenTopoMap (CC-BY-SA : relief très contrasté, courbes de niveau ; zoom max 17).
// Ce sont des SERVICES EN LIGNE tiers : il faut citer leurs crédits (MAP_STYLES[style].credit) et respecter leurs règles d'usage (usage raisonnable, pas de téléchargement en masse).
export const MAP_STYLES = {
  street: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', credit: 'Esri, HERE, Garmin, USGS, NGA, © OpenStreetMap contributors', zMax: 17 },
  clean: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}', credit: 'Esri, GEBCO, NOAA, National Geographic, DeLorme, HERE, Geonames.org, and other contributors', zMax: 10, maxAltKm: 400 },   // SANS noms de villes : relief, forêts, lacs et rivières, côtes (au-delà du niveau 10 : pas de données)
  terrain: { url: 'https://a.tile.opentopomap.org/{z}/{x}/{y}.png', credit: '© OpenStreetMap contributors, SRTM · style © OpenTopoMap (CC-BY-SA)', zMax: 17 },
};
export const MAP_URL = MAP_STYLES.street.url;
export const MAP_CREDIT = MAP_STYLES.street.credit;
export const MAP_Z_MIN = 3, MAP_Z_MAX = 17;   // niveaux de zoom utilisés
export const MAP_RADIUS = 3;                    // grille de (2 × 3 + 1)² = 49 tuiles autour du point regardé
export const MAP_MAX_ALT_KM = 900;              // au-dessus : la carte dessinée de la Terre reste affichée (un style peut fixer son propre `maxAltKm` : « clean » = 400 km)
export const MAP_HYSTERESIS = 1.12;             // une fois affichée, la carte détaillée ne disparaît qu'à 12 % au-dessus du seuil (pas de clignotement)
export const mapMaxAlt = style => (MAP_STYLES[style] && MAP_STYLES[style].maxAltKm) || MAP_MAX_ALT_KM;
const R2D = 180 / Math.PI, EARTH_CIRC_KM = 40075.017;

export const tileUrl = (z, x, y, template) => (template || MAP_URL).replace('{z}', z).replace('{x}', x).replace('{y}', y);

// nombre de tuiles par côté au niveau z
export const tilesAt = z => Math.pow(2, z);

// longitude (°) du bord gauche de la colonne x au niveau z
export const tileLon = (x, z) => (x / tilesAt(z)) * 360 - 180;
// latitude (°) du bord supérieur de la ligne y au niveau z (projection Web Mercator)
export const tileLat = (y, z) => Math.atan(Math.sinh(Math.PI * (1 - 2 * y / tilesAt(z)))) * R2D;
// limites d'une tuile : [lonOuest, lonEst, latSud, latNord]
export const tileBounds = (x, y, z) => [tileLon(x, z), tileLon(x + 1, z), tileLat(y + 1, z), tileLat(y, z)];

// tuile qui contient (lon, lat) au niveau z
export function tileAt(lon, lat, z) {
  const n = tilesAt(z), la = Math.max(-85.0511, Math.min(85.0511, lat)) / R2D;
  const x = Math.floor(((lon + 180) / 360) * n), y = Math.floor(((1 - Math.log(Math.tan(la) + 1 / Math.cos(la)) / Math.PI) / 2) * n);
  return { x: ((x % n) + n) % n, y: Math.max(0, Math.min(n - 1, y)), z };
}

// ordonnée Mercator (sans unité) d'une latitude : sert à placer la texture d'une tuile sur la sphère
export const mercY = lat => Math.log(Math.tan(Math.PI / 4 + Math.max(-85.0511, Math.min(85.0511, lat)) / R2D / 2));

// niveau de zoom adapté à l'altitude de la caméra : la grille de 7 tuiles de large doit couvrir à peu près ce que voit l'écran
// (largeur vue ≈ 2 · altitude · tan(champ / 2) · aspect ; on vise 1 tuile ≈ 1/6 de cette largeur : image nette)
export function mapZoom(altKm, latDeg, fovDeg, aspect) {
  const span = 2 * Math.max(0.05, altKm) * Math.tan(fovDeg * Math.PI / 360) * Math.max(1, aspect || 1.6), tileKm = span / 6;
  const z = Math.log2(EARTH_CIRC_KM * Math.max(0.05, Math.cos(latDeg / R2D)) / tileKm);
  return Math.max(MAP_Z_MIN, Math.min(MAP_Z_MAX, Math.round(z)));
}

// tuiles à charger autour de (lon, lat) : grille carrée de rayon MAP_RADIUS (colonnes bouclées autour du globe, lignes limitées aux pôles de la projection)
export function mapTiles(lon, lat, z, radius = MAP_RADIUS) {
  const c = tileAt(lon, lat, z), n = tilesAt(z), out = [];
  for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
    const y = c.y + dy; if (y < 0 || y >= n) continue;
    const x = (((c.x + dx) % n) + n) % n;
    if (n <= 2 * radius + 1 && out.some(t => t.x === x && t.y === y)) continue;   // petit niveau de zoom : pas de doublons quand la grille fait le tour du globe
    out.push({ x, y, z, key: z + '/' + x + '/' + y, d: Math.hypot(dx, dy) });
  }
  return out.sort((a, b) => a.d - b.d);   // les plus proches du centre d'abord
}
