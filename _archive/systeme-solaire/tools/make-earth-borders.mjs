// Génère js/lazy/earth-borders.js : frontières des pays, noms de pays (en français) et villes, d'après Natural Earth 1:10 000 000 (domaine public).
// Ce fichier est chargé À LA DEMANDE par la page (balise <script> ajoutée quand on zoome sur la Terre), pas par index.html.
//   node tools/make-earth-borders.mjs [dossier]   dossier contenant ne_10m_admin_0_boundary_lines_land.geojson, ne_10m_admin_0_countries.geojson, ne_10m_populated_places.geojson
//   (https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ ; sans dossier : téléchargement automatique, ≈ 35 Mo)
// Options : --tol 0.004 (degrés, simplification des lignes)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dp } from './lib/simplify.mjs';

const args = process.argv.slice(2), dirArg = args[0] && !args[0].startsWith('--') ? args[0] : null;
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? +args[i + 1] : d; };
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), BASE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/';
const TOL = opt('tol', 0.004);
const load = async f => dirArg ? JSON.parse(fs.readFileSync(path.join(dirArg, f + '.geojson'), 'utf8')) : await (await fetch(BASE + f + '.geojson')).json();

// frontières : on garde les frontières terrestres ; celles dont le statut est incertain ou contesté sont en pointillés (type 1)
const bl = await load('ne_10m_admin_0_boundary_lines_land'), lines = []; let ptsIn = 0, ptsOut = 0;
for (const f of bl.features) {
  const type = f.properties.TYPE || '', fc = f.properties.FEATURECLA || '';
  if (/Water/i.test(type)) continue;   // limites en mer
  const kind = /^International boundary|Lease limit/.test(fc) ? 0 : 1;
  const ls = f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const l of ls) {
    ptsIn += l.length; const s = dp(l.map(p => [p[0], p[1]]), TOL); if (s.length < 2) continue;
    lines.push([kind, s.flatMap(p => [Math.round(p[0] * 1000), Math.round(p[1] * 1000)])]); ptsOut += s.length;   // millièmes de degré (~110 m)
  }
}
// trait de côte : contours des terres (ne_10m_land, anneaux fermés) → type 2, tracé net entre mer et continent
const COAST_TOL = opt('coast-tol', 0.005); let coastIn = 0, coastOut = 0;
for (const f of (await load('ne_10m_land')).features) {
  const g = f.geometry, polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  for (const poly of polys) for (const ring of poly) {
    coastIn += ring.length; const pts = ring.map(p => [p[0], p[1]]), h = pts.length >> 1;   // anneau fermé : coupé en deux (dp d'une boucle dégénère)
    const s = ring.length < 4 ? [] : [...dp(pts.slice(0, h + 1), COAST_TOL), ...dp(pts.slice(h), COAST_TOL).slice(1)]; if (s.length < 4) continue;
    lines.push([2, s.flatMap(p => [Math.round(p[0] * 1000), Math.round(p[1] * 1000)])]); coastOut += s.length;
  }
}
console.error(`côtes ${coastIn} -> ${coastOut} points`);
// pays : nom français, point d'étiquette, zoom minimal d'affichage (échelle des cartes web : 0 = monde entier ; MIN_LABEL de Natural Earth)
const countries = (await load('ne_10m_admin_0_countries')).features.filter(f => f.properties.LABEL_X != null)
  .map(f => { const p = f.properties; return [p.NAME_FR || p.NAME_EN || p.NAME, +p.LABEL_X.toFixed(2), +p.LABEL_Y.toFixed(2), Math.round((p.MIN_LABEL ?? 6) * 10)]; })
  .sort((a, b) => a[3] - b[3]);
// villes : nom français, lon, lat, zoom minimal ×10, population (milliers), capitale d'État ; les plus grandes d'abord
const cities = (await load('ne_10m_populated_places')).features
  .map(f => { const p = f.properties, [lon, lat] = f.geometry.coordinates; return [p.NAME_FR || p.NAME_EN || p.NAME, +lon.toFixed(3), +lat.toFixed(3), Math.round((p.MIN_ZOOM ?? 7) * 10), Math.round((p.POP_MAX || 0) / 1000), p.ADM0CAP ? 1 : 0]; })
  .sort((a, b) => b[4] - a[4]);
const js = `// Frontières, pays (noms français) et villes de la Terre — Natural Earth 1:10 000 000 (domaine public). GÉNÉRÉ par tools/make-earth-borders.mjs — ne pas éditer à la main.
// Chargé à la demande (js/earth-borders.js ajoute une balise <script>). lines : [type (0 frontière, 1 contestée, 2 trait de côte), [lon0, lat0, lon1, lat1, …] en millièmes de degré] ;
// countries : [nom, lon, lat, zoom minimal ×10] ; cities : [nom, lon, lat, zoom minimal ×10, population en milliers, capitale 0/1].
const EARTH_BORDERS = { lines: ${JSON.stringify(lines)}, countries: ${JSON.stringify(countries)}, cities: ${JSON.stringify(cities)} };
`;
fs.mkdirSync(path.join(ROOT, 'js', 'lazy'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'js', 'lazy', 'earth-borders.js'), js);
console.error(`frontières ${lines.length} lignes, points ${ptsIn} -> ${ptsOut} ; pays ${countries.length} ; villes ${cities.length} ; fichier ${(js.length / 1024).toFixed(0)} Ko`);
