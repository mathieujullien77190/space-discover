// Capitales du monde (option « Capitales » de la carte) : Natural Earth « Populated Places » 1:50m, DOMAINE PUBLIC (https://www.naturalearthdata.com/), noms en français (NAME_FR).
// télécharge le GeoJSON (3 Mo, mis en cache dans tools/.cache) et écrit src/engine/data/capitals.js : [[nom, latitude, longitude, population], …] triées par population décroissante.
// node tools/make-capitals.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), cache = path.join(root, 'tools', '.cache', 'ne_50m_populated_places.geojson'), out = path.join(root, 'src', 'engine', 'data', 'capitals.js');
if (!fs.existsSync(cache)) {
  fs.mkdirSync(path.dirname(cache), { recursive: true });
  const r = await fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_populated_places.geojson');
  if (!r.ok) throw new Error('téléchargement : ' + r.status);
  fs.writeFileSync(cache, Buffer.from(await r.arrayBuffer()));
}
const caps = JSON.parse(fs.readFileSync(cache, 'utf8')).features.map(f => f.properties).filter(p => p.ADM0CAP === 1)
  .map(p => [String(p.NAME_FR || p.NAME_EN || p.NAME), Math.round(p.LATITUDE * 100) / 100, Math.round(p.LONGITUDE * 100) / 100, p.POP_MAX || 0])
  .sort((a, b) => b[3] - a[3]);
fs.writeFileSync(out, '// GÉNÉRÉ par tools/make-capitals.mjs (Natural Earth, domaine public) : ne pas éditer.\n// [nom en français, latitude, longitude, population], triées par population décroissante\nexport const CAPITALS = ' + JSON.stringify(caps) + ';\n');
console.log(caps.length + ' capitales → ' + out);
