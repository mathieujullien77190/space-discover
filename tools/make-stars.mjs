// VRAI ciel étoilé : catalogue des étoiles de magnitude ≤ 6 (≈ 5 000 étoiles visibles à l'œil nu : positions Hipparcos / Yale Bright Star, couleur = indice B−V),
// tel que le distribue d3-celestial (https://github.com/ofrohn/d3-celestial, licence BSD-3, données astronomiques libres).
// télécharge data/stars.6.json (0,6 Mo, cache dans tools/.cache) et écrit src/engine/data/stars.js : [[ascension droite °, déclinaison °, magnitude, B−V], …] triées de la plus brillante à la plus faible.
// node tools/make-stars.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), cache = path.join(root, 'tools', '.cache', 'stars6.json'), out = path.join(root, 'src', 'engine', 'data', 'stars.js');
if (!fs.existsSync(cache)) {
  fs.mkdirSync(path.dirname(cache), { recursive: true });
  const r = await fetch('https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/stars.6.json');
  if (!r.ok) throw new Error('téléchargement : ' + r.status);
  fs.writeFileSync(cache, Buffer.from(await r.arrayBuffer()));
}
const stars = JSON.parse(fs.readFileSync(cache, 'utf8')).features
  .map(f => { const [lon, lat] = f.geometry.coordinates, bv = parseFloat(f.properties.bv); return [Math.round(((lon % 360) + 360) % 360 * 1000) / 1000, Math.round(lat * 1000) / 1000, Math.round(f.properties.mag * 100) / 100, Number.isFinite(bv) ? Math.round(bv * 100) / 100 : 0.6]; })
  .sort((a, b) => a[2] - b[2]);
fs.writeFileSync(out, '// GÉNÉRÉ par tools/make-stars.mjs (d3-celestial, BSD-3 ; Hipparcos / Yale Bright Star) : ne pas éditer.\n// [ascension droite (°), déclinaison (°), magnitude, B−V], de la plus brillante à la plus faible\nexport const STARS = ' + JSON.stringify(stars) + ';\n');
console.log(stars.length + ' étoiles (magnitude ' + stars[0][2] + ' à ' + stars[stars.length - 1][2] + ') → ' + out);
