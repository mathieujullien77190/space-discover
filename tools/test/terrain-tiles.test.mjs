// Relief + imagerie satellite : maths des tuiles Web Mercator, décodage Terrarium, interpolation, niveau de zoom, grille, rayon des sommets.
import { DEM_URL, IMAGERY_URL, SEA_LEVEL_OFFSET, TERRAIN_EXAGGERATION, sampleDem, terrainTiles, terrainZoom, terrariumElevation, tileAt, tileBounds, tileHeights, tileUrl, vertexRadius } from '../../src/engine/terrain-tiles.js';

const fails = [], check = (c, m) => { console.log((c ? 'ok   ' : 'ÉCHEC ') + m); if (!c) fails.push(m); };
const p = tileAt(2.3522, 48.8566, 10);
check(p.x === 518 && p.y === 352, 'Paris au niveau 10 = tuile 10/518/352 (' + p.z + '/' + p.x + '/' + p.y + ')');
const b = tileBounds(p.x, p.y, p.z);
check(b[0] <= 2.3522 && 2.3522 <= b[1] && b[2] <= 48.8566 && 48.8566 <= b[3], 'la tuile contient bien Paris');
check(terrariumElevation(128, 0, 0) === 0 && terrariumElevation(128, 100, 0) === 100 && terrariumElevation(0, 0, 0) === -32768, 'décodage Terrarium : 0 m, 100 m, −32 768 m');
// image synthétique 4 × 4 : altitude = 100 × (colonne + ligne)
const W = 4, px = new Uint8ClampedArray(W * W * 4);
for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const e = 100 * (x + y) + 32768, i = 4 * (y * W + x); px[i] = Math.floor(e / 256); px[i + 1] = e % 256; px[i + 2] = 0; px[i + 3] = 255; }
check(Math.abs(sampleDem(px, W, W, 0, 0)) < 1e-9 && Math.abs(sampleDem(px, W, W, 1, 1) - 600) < 1e-9, 'échantillonnage : coins 0 m et 600 m');
check(Math.abs(sampleDem(px, W, W, 0.5, 0.5) - 300) < 1e-6, 'interpolation bilinéaire au centre : 300 m (' + sampleDem(px, W, W, 0.5, 0.5).toFixed(1) + ')');
const hs = tileHeights(px, W, W, 3, 3);
check(hs.length === 16 && hs[0] === 0 && Math.abs(hs[15] - 600) < 1e-6, 'grille de hauteurs 4 × 4 de la tuile');
const neg = new Uint8ClampedArray(4 * 4); for (let i = 0; i < 4; i++) { neg[4 * i] = 127; neg[4 * i + 1] = 0; neg[4 * i + 3] = 255; }   // −256 m (fond marin)
check(tileHeights(neg, 2, 2, 1, 1).every(v => v === 0), 'sous le niveau de la mer : ramené à 0 (mer plate)');
const z200 = terrainZoom(200, 48, 50, 1.8), z800 = terrainZoom(800, 48, 50, 1.8), z2 = terrainZoom(2, 48, 50, 1.8);
check(z200 >= 8 && z200 <= 10 && z800 < z200 && z2 === 14, 'zoom : ' + z800 + ' à 800 km, ' + z200 + ' à 200 km, ' + z2 + ' à 2 km (14 au plus)');
const g = terrainTiles(2.35, 48.85, 10);
check(g.length === 49 && new Set(g.map(t => t.key)).size === 49 && g[0].d === 0, 'grille de 49 tuiles distinctes, la plus proche du centre d’abord');
const a = terrainTiles(179.9, 10, 8);
check(a.some(t => t.x === 0) && a.some(t => t.x === 255), 'à l’antiméridien la grille boucle autour du globe');
check(terrainTiles(10, 84, 6).every(t => t.y >= 0 && t.y < 64), 'près du pôle : lignes limitées à la projection');
check(vertexRadius(0) === 1 + SEA_LEVEL_OFFSET && vertexRadius(0) > 1 + 3e-6, 'niveau de la mer : au-dessus du maillage de la Terre (≈ 50 m)');
const ev = vertexRadius(8848) - vertexRadius(0);
check(Math.abs(ev - 8848 * TERRAIN_EXAGGERATION / 6378137) < 1e-12 && ev * 6378 > 17 && ev * 6378 < 18, 'Everest exagéré ×' + TERRAIN_EXAGGERATION + ' : ' + (ev * 6378).toFixed(1) + ' km au-dessus de la mer dans la scène');
check(tileUrl(5, 1, 2, IMAGERY_URL) === 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/5/2/1' && tileUrl(5, 1, 2, DEM_URL) === 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/5/1/2.png', 'URLs : ordre {z}/{y}/{x} (Esri) et {z}/{x}/{y} (Terrarium)');
if (fails.length) { console.log(fails.length + ' échec(s)'); process.exit(1); }
