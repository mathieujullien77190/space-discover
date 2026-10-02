// Génère js/lazy/earth-countries.js : contours simplifiés des pays (Natural Earth 1:10 M, domaine public) pour savoir SUR QUEL PAYS on clique sur le globe.
// Chargé à la demande au premier clic sur la Terre (balise <script>, comme les frontières). Contours grossiers (tolérance 0,06° ≈ 6 km) : pour désigner un pays, pas pour le dessiner.
//   node tools/make-earth-countries.mjs [dossier]   (dossier contenant ne_10m_admin_0_countries.geojson ; sans dossier : téléchargement)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dp } from './lib/simplify.mjs';
const args = process.argv.slice(2), dirArg = args[0] && !args[0].startsWith('--') ? args[0] : null;
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), BASE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/';
const TOL = 0.06, MIN_AREA = 0.02;   // degrés ; surface minimale d'un morceau (deg²)
const gj = dirArg ? JSON.parse(fs.readFileSync(path.join(dirArg, 'ne_10m_admin_0_countries.geojson'), 'utf8')) : await (await fetch(BASE + 'ne_10m_admin_0_countries.geojson')).json();
const names = [], parts = []; let ptsIn = 0, ptsOut = 0;
const area = r => { let a = 0; for (let i = 0; i < r.length; i++) { const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % r.length]; a += x1 * y2 - x2 * y1; } return Math.abs(a) / 2; };
for (const f of gj.features) {
  const p = f.properties, name = p.NAME_FR || p.NAME_EN || p.NAME, ci = names.length; names.push(name);
  const g = f.geometry, polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  for (const poly of polys) {
    const ring = poly[0]; ptsIn += ring.length; const A = area(ring); if (A < MIN_AREA) continue;
    const h = ring.length >> 1, s = [...dp(ring.slice(0, h + 1).map(q => [q[0], q[1]]), TOL), ...dp(ring.slice(h).map(q => [q[0], q[1]]), TOL).slice(1)];
    if (s.length < 4) continue;
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const [x, y] of s) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    parts.push([ci, +A.toFixed(3), [x0, x1, y0, y1].map(v => Math.round(v * 100)), s.flatMap(q => [Math.round(q[0] * 100), Math.round(q[1] * 100)])]); ptsOut += s.length;   // centièmes de degré
  }
}
parts.sort((a, b) => a[1] - b[1]);   // les petits morceaux d'abord : une enclave (Lesotho) l'emporte sur le pays qui l'entoure
const js = `// Contours simplifiés des pays (Natural Earth 1:10 M, domaine public) pour désigner le pays cliqué. GÉNÉRÉ par tools/make-earth-countries.mjs — ne pas éditer à la main.\n// Chargé à la demande (js/earth-borders.js). names : noms français ; parts : [indice du pays, surface (deg²), [lonMin, lonMax, latMin, latMax], [lon0, lat0, lon1, lat1, …]] en centièmes de degré, du plus petit au plus grand.\nconst EARTH_COUNTRIES = { names: ${JSON.stringify(names)}, parts: ${JSON.stringify(parts)} };\n`;
fs.mkdirSync(path.join(ROOT, 'js', 'lazy'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'js', 'lazy', 'earth-countries.js'), js);
console.error(`pays ${names.length}, morceaux ${parts.length}, points ${ptsIn} -> ${ptsOut}, fichier ${(js.length / 1024).toFixed(0)} Ko`);
