// Fond de carte « plan » : mathématiques des tuiles Web Mercator (pures) : tuile de Paris, bornes, zoom selon l'altitude, grille autour du point regardé.
import { MAP_STYLES, mapTiles, mapZoom, mercY, tileAt, tileBounds, tileUrl } from '../../src/engine/map-tiles.js';

const fails = [], check = (c, m) => { console.log((c ? 'ok   ' : 'ÉCHEC ') + m); if (!c) fails.push(m); };
const p = tileAt(2.3522, 48.8566, 10);
check(p.x === 518 && p.y === 352 && p.z === 10, 'Paris au niveau 10 = tuile 10/518/352 (' + p.z + '/' + p.x + '/' + p.y + ')');
const b = tileBounds(p.x, p.y, p.z);
check(b[0] <= 2.3522 && 2.3522 <= b[1] && b[2] <= 48.8566 && 48.8566 <= b[3], 'la tuile contient bien Paris : lon ' + b[0].toFixed(3) + '…' + b[1].toFixed(3) + ', lat ' + b[2].toFixed(3) + '…' + b[3].toFixed(3));
const w = tileBounds(0, 0, 0);
check(Math.abs(w[0] + 180) < 1e-9 && Math.abs(w[1] - 180) < 1e-9 && Math.abs(w[3] - 85.0511) < 1e-3 && Math.abs(w[2] + 85.0511) < 1e-3, 'niveau 0 : le monde entier de −180 à 180°, ±85,0511° de latitude');
check(Math.abs(mercY(0)) < 1e-12 && mercY(60) > mercY(30), 'ordonnée Mercator : nulle à l’équateur et croissante');
const z200 = mapZoom(200, 48, 50, 1.8), z800 = mapZoom(800, 48, 50, 1.8);
check(z200 >= 8 && z200 <= 10 && z800 < z200, 'zoom à 200 km d’altitude : ' + z200 + ' (8 à 10), à 800 km : ' + z800 + ' (plus faible)');
const g = mapTiles(2.35, 48.85, 10);
check(g.length === 49 && new Set(g.map(t => t.key)).size === 49 && g[0].d === 0, 'grille de 49 tuiles distinctes, la plus proche du centre d’abord');
const a = mapTiles(179.9, 10, 8);
check(a.some(t => t.x === 0) && a.some(t => t.x === 255), 'à l’antiméridien la grille boucle autour du globe (colonnes 255 et 0)');
const small = mapTiles(0, 0, 3);
check(new Set(small.map(t => t.key)).size === small.length && small.length <= 64, 'petit niveau de zoom : pas de doublons (' + small.length + ' tuiles)');
const pole = mapTiles(10, 84, 6);
check(pole.every(t => t.y >= 0 && t.y < 64), 'près du pôle : lignes limitées à la projection');
check(tileUrl(5, 1, 2, MAP_STYLES.street.url) === 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/5/2/1' && !/carto/i.test(MAP_STYLES.street.url), 'URL Esri : ordre {z}/{y}/{x}, plus de CARTO (clé exigée)');
check(tileUrl(5, 1, 2, MAP_STYLES.terrain.url) === 'https://a.tile.opentopomap.org/5/1/2.png' && /\{z\}/.test(MAP_STYLES.street.url), 'URLs : remplacement de {z}/{x}/{y}');
check(MAP_STYLES.street.credit.includes('Esri') && MAP_STYLES.terrain.credit.includes('OpenTopoMap'), 'crédits des deux fonds présents');
if (fails.length) { console.log(fails.length + ' échec(s)'); process.exit(1); }
