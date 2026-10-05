// Relief + imagerie satellite : maths des tuiles Web Mercator, décodage Terrarium, interpolation, niveau de zoom, grille, rayon des sommets.
import { AIM_LEVELS, AIM_MIN_RATIO, terrainWanted, DEM_URL, IMAGERY_URL, SEA_LEVEL_OFFSET, TERRAIN_EXAGGERATION, horizonKm, terrainFallbacks, terrainLevels, TERRAIN_MAX_ALT_KM, DEM_MIN_Z, tileSegments, MAX_FACET_DEG, sampleDem, terrainTiles, terrainZoom, terrariumElevation, tileAt, tileBounds, tileHeights, tileUrl, vertexRadius } from '../../src/engine/terrain-tiles.js';

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
const z200 = terrainZoom(200, 48, 50, 1.8), z800 = terrainZoom(1000, 48, 50, 1.8), z2 = terrainZoom(2, 48, 50, 1.8);
check(z200 >= 8 && z200 <= 10 && z800 < z200 && z2 === 14, 'zoom : ' + z800 + ' à 1 000 km, ' + z200 + ' à 200 km, ' + z2 + ' à 2 km (14 au plus)');
const g = terrainTiles(2.35, 48.85, 10);
check(g.length === 81 && new Set(g.map(t => t.key)).size === 81 && g[0].d === 0, 'grille de 81 tuiles (9 × 9) distinctes, la plus proche du centre d’abord');
const a = terrainTiles(179.9, 10, 8);
check(a.some(t => t.x === 0) && a.some(t => t.x === 255), 'à l’antiméridien la grille boucle autour du globe');
check(terrainTiles(10, 84, 6).every(t => t.y >= 0 && t.y < 64), 'près du pôle : lignes limitées à la projection');
check(vertexRadius(0) === 1 + SEA_LEVEL_OFFSET && vertexRadius(0) > 1 + 3e-6, 'niveau de la mer : au-dessus du maillage de la Terre (≈ 50 m)');
const ev = vertexRadius(8848) - vertexRadius(0);
check(Math.abs(ev - 8848 * TERRAIN_EXAGGERATION / 6378137) < 1e-12 && ev * 6378 > 8 && ev * 6378 < 9.5, 'Everest ×' + TERRAIN_EXAGGERATION + ' : ' + (ev * 6378).toFixed(1) + ' km au-dessus de la mer dans la scène');
check(tileUrl(5, 1, 2, IMAGERY_URL) === 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/5/2/1' && tileUrl(5, 1, 2, DEM_URL) === 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/5/1/2.png', 'URLs : ordre {z}/{y}/{x} (Esri) et {z}/{x}/{y} (Terrarium)');
const iss = terrainLevels(2.35, 48.85, 420, 50, 1.8), hz = horizonKm(420);
check(hz > 2200 && hz < 2400, 'horizon à 420 km d’altitude (ISS) : ' + Math.round(hz) + ' km');
check(iss.length >= 3 && iss[0].tiles.length === 81 && iss[0].dem && iss.slice(1).every(l => !l.dem), 'ISS : ' + iss.length + ' niveaux emboîtés (z ' + iss.map(l => l.z).join(', ') + '), relief seulement au niveau le plus fin');
const last = iss[iss.length - 1], ext = (3 + 0.5) * 40075 * Math.cos(48.85 * Math.PI / 180) / Math.pow(2, last.z);
check(ext >= hz, 'le dernier niveau atteint l’horizon (' + Math.round(ext) + ' km ≥ ' + Math.round(hz) + ' km)');
const total = iss.reduce((a, l) => a + l.tiles.length, 0);
check(total < 260 && iss[1].tiles.length < 49 && iss[1].tiles.length > 20, 'tuiles recouvertes par le niveau plus fin exclues : ' + iss.map(l => l.tiles.length).join(' + ') + ' = ' + total + ' (moins de 260)');
const low = terrainLevels(2, 48, 20, 50, 1.8);
check(low.length >= 2 && low.length <= 5 && low[0].z >= 11, 'très bas (20 km) : z ' + low[0].z + ' au plus fin puis des niveaux plus larges jusqu’à l’horizon de 160 km (' + low.length + ' niveaux)');
const wantFb = [{ x: 10, y: 6, z: 5, key: '5/10/6', k: 0, d: 0 }, { x: 11, y: 6, z: 5, key: '5/11/6', k: 0, d: 1 }, { x: 12, y: 6, z: 5, key: '5/12/6', k: 0, d: 2 }];
const fbs = terrainFallbacks(wantFb, key => key === '5/12/6');
check(fbs.length === 1 && fbs[0].key === '4/5/3' && fbs[0].z === 4 && !fbs[0].dem && fbs[0].k === 1, 'tuiles de secours : les deux tuiles manquantes (5/10/6, 5/11/6) ont la même parente 4/5/3, la tuile prête n’en demande pas');
check(terrainFallbacks(wantFb, () => true).length === 0, 'tout est prêt : aucune tuile de secours');
check(terrainFallbacks([{ x: 0, y: 0, z: 3, key: '3/0/0' }], () => false).length === 0, 'au niveau de zoom minimal : pas de parente');
const sag = (b, seg) => 6378137 * (1 - Math.cos((Math.max(b[1] - b[0], b[3] - b[2]) / seg / 2) * Math.PI / 180));
const bz5 = tileBounds(16, 11, 5), bz3 = tileBounds(4, 2, 3), bz10 = tileBounds(518, 352, 10);
check(sag(bz5, tileSegments(bz5, 12)) < 6378137 * SEA_LEVEL_OFFSET, 'tuile lointaine z5 : ' + tileSegments(bz5, 12) + ' facettes, la corde plonge de ' + sag(bz5, tileSegments(bz5, 12)).toFixed(0) + ' m < ' + Math.round(6378137 * SEA_LEVEL_OFFSET) + ' m de marge (sinon la carte dessinée perce)');
check(tileSegments(bz3, 12) === Math.ceil(45 / MAX_FACET_DEG) && tileSegments(bz10, 12) === 12 && tileSegments(bz10, 32) === 32 && MAX_FACET_DEG === 0.4, 'z3 : 45° / 0,4° = 113 facettes (plafond 128) ; z10 : le minimum demandé suffit');
const high = terrainLevels(2, 48, 1200, 50, 1.8), hh = horizonKm(1200), lastH = high[high.length - 1];
check(TERRAIN_MAX_ALT_KM === 1200, 'le fond de carte détaillé apparaît dès 1 200 km d’altitude');
check(high.length >= 2 && high[0].z < DEM_MIN_Z && !high[0].dem, 'à 1 200 km : ' + high.length + ' niveaux (z ' + high.map(l => l.z).join(', ') + '), le plus fin sans téléchargement d’altitudes (z < ' + DEM_MIN_Z + ')');
check((3 + 0.5) * 40075 * Math.cos(48 * Math.PI / 180) / Math.pow(2, lastH.z) >= hh * 0.9 || lastH.z === 3, 'les niveaux atteignent l’horizon (' + Math.round(hh) + ' km) ou le zoom minimal');
if (fails.length) { console.log(fails.length + ' échec(s)'); process.exit(1); }
// qualité max au ras du sol (observatoire, 3 km) : tous les niveaux ont leur relief, pas de falaise contre une tuile lointaine à plat
{
  const hq = terrainLevels(0.1426, 42.9369, 3, 70, 1.6), hqLast = hq[hq.length - 1];
  check(hq.length >= 3 && hq.every(l => l.dem === (l.z >= DEM_MIN_Z)), 'à 3 km : ' + hq.length + ' niveaux (z ' + hq.map(l => l.z).join(', ') + '), TOUS avec relief (z ≥ ' + DEM_MIN_Z + ')');
  check(hq[0].tiles.length === 81 && hq.length > 1 && hq[1].tiles.length > 0, 'niveau fin : 81 tuiles ; niveaux lointains présents');
  const ext = (4 + 0.5) * 40075 * Math.cos(42.9369 * Math.PI / 180) / Math.pow(2, hqLast.z);
  check(ext >= horizonKm(3) || hq.length === 6, 'la grille du dernier niveau atteint l’horizon (' + Math.round(ext) + ' km ≥ ' + Math.round(horizonKm(3)) + ' km) ou six niveaux');
}
// regard oblique : le point regardé (loin du nadir) reçoit ses propres niveaux, adaptés à la distance oblique
{
  const lon = 0.1426, lat = 42.9369, alt = 3, aim = { lon: 0.1426, lat: 43.1, distKm: 30 }, base = terrainWanted(lon, lat, alt, 50, 1.6, null), wide = terrainWanted(lon, lat, alt, 50, 1.6, aim);
  check(wide.length > base.length && wide.filter(t => t.aim).length > 0, 'regard oblique : ' + (wide.length - base.length) + ' tuiles ajoutées autour du point regardé (' + base.length + ' → ' + wide.length + ')');
  check(new Set(wide.map(t => t.key)).size === wide.length, 'aucune tuile en double');
  const aimTiles = wide.filter(t => t.aim), zAim = Math.max(...aimTiles.map(t => t.z));
  check(zAim < Math.max(...base.map(t => t.z)) && zAim >= 10, 'zoom du point regardé d’après la distance oblique (z ' + zAim + ' pour 30 km, contre z ' + Math.max(...base.map(t => t.z)) + ' sous la caméra à 3 km)');
  const zTop = Math.max(...wide.map(t => t.z));
  check(wide.every(t => t.k === zTop - t.z), 'ordre de dessin : k = écart au zoom le plus fin');
  const near = terrainWanted(lon, lat, alt, 50, 1.6, { lon, lat, distKm: 3.2 });
  check(near.length === base.length, 'regard vers le bas (distance ≈ altitude) : rien de plus');
  check(AIM_MIN_RATIO > 1 && AIM_LEVELS >= 1, 'seuils : distance oblique ≥ ' + AIM_MIN_RATIO + ' × altitude, ' + AIM_LEVELS + ' niveaux');
}
if (fails.length) { console.log(fails.length + ' échec(s)'); process.exit(1); }
