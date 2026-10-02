// Génère js/surface-earth.js : la Terre d'après Natural Earth (domaine public) à 1:10 000 000 — terres (Antarctique compris), glaciers et calottes, lacs —
// simplifiée pour un globe (Douglas-Peucker, auto-intersections corrigées, arêtes longues densifiées, orientation normalisée).
//   node tools/make-earth-land.mjs [dossier]   dossier contenant ne_10m_land.geojson, ne_10m_glaciated_areas.geojson, ne_10m_lakes.geojson
//   (téléchargés depuis https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ ; sans dossier : téléchargement automatique)
// Options : --tol 0.05 (degrés) --min 0.03 (aire minimale d'un morceau, deg²)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pack, toJs, normalizeRings } from './lib/simplify.mjs';

const args = process.argv.slice(2), dirArg = args[0] && !args[0].startsWith('--') ? args[0] : null;
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? +args[i + 1] : d; };
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), BASE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/';
const TOL = opt('tol', 0.05), MIN = opt('min', 0.03);
const load = async f => dirArg ? JSON.parse(fs.readFileSync(path.join(dirArg, f + '.geojson'), 'utf8')) : await (await fetch(BASE + f + '.geojson')).json();

const CLASSES = [['Terres émergées', '#5a9a4b'], ['Glaciers et calottes polaires', '#eef3f7'], ['Lacs', '#3a6cb0']];   // ordre = ordre de dessin : les lacs et la glace recouvrent la terre
const parts = [], polygons = []; const stats = {}; let nIn = 0, ptsIn = 0, ptsOut = 0, flipped = 0;
function eat(gj, cls, min, iceBelow) {
  for (const f of gj.features) {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const poly of polys) {
      const { rings, flipped: fl } = normalizeRings(poly); flipped += fl;
      // l'Antarctique (terre sous 60° S) est une calotte de glace
      const c = iceBelow !== undefined && rings[0].reduce((s, p) => s + p[1], 0) / rings[0].length < iceBelow ? 1 : cls;
      const packed = rings.map(ring => { nIn++; ptsIn += ring.length; const p = pack(ring, TOL, min, stats); if (p) { parts.push({ a: p.a, c, r: p.r }); ptsOut += p.r.length; } return p; });
      if (packed[0]) polygons.push({ c, rings: packed.filter(Boolean) });   // le premier anneau est l'extérieur ; les trous suivent
    }
  }
}
eat(await load('ne_10m_land'), 0, MIN, -62);
eat(await load('ne_10m_glaciated_areas'), 1, MIN * 2);
eat(await load('ne_10m_lakes'), 2, MIN * 4);
const js = toJs('SURF_EARTH', "// La Terre d'après Natural Earth 1:10 000 000 (domaine public) : terres, glaciers et calottes, lacs. GÉNÉRÉ par tools/make-earth-land.mjs — ne pas éditer à la main.", CLASSES, parts, true);
fs.writeFileSync(path.join(ROOT, 'js', 'surface-earth.js'), js);
console.error(`Terre : ${flipped} anneaux remis dans le bon sens, ${stats.crossed || 0} resimplifiés, ${stats.dropped || 0} écartés ; morceaux ${nIn} -> ${parts.length}, points ${ptsIn} -> ${ptsOut}, fichier ${(js.length / 1024).toFixed(0)} Ko`);
// GeoJSON conforme RFC 7946 (extérieurs antihoraires, trous horaires, coupé à l'antiméridien) pour Leaflet, QGIS, geojson.io
const ring2 = (r, rev) => { const pts = r.map(([x, y]) => [x / 10, y / 10]); if (rev) pts.reverse(); pts.push(pts[0]); return pts; };
const gj = { type: 'FeatureCollection', name: 'earth-land', features: polygons.map(p => ({ type: 'Feature', properties: { class: ['land', 'ice', 'lake'][p.c] }, geometry: { type: 'Polygon', coordinates: p.rings.map((p2, i) => ring2(p2.r, true)) } })) };
fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'data', 'earth-land.geojson'), JSON.stringify(gj));
console.error(`GeoJSON : ${gj.features.length} polygones, ${(JSON.stringify(gj).length / 1024).toFixed(0)} Ko (data/earth-land.geojson)`);
CLASSES.forEach((c, i) => console.error(c[0].padEnd(30), String(parts.filter(p => p.c === i).length).padStart(5)));
