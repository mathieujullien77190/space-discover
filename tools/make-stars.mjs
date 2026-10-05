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
  .map(f => { const [lon, lat] = f.geometry.coordinates, bv = parseFloat(f.properties.bv); return [Math.round(((lon % 360) + 360) % 360 * 1000) / 1000, Math.round(lat * 1000) / 1000, Math.round(f.properties.mag * 100) / 100, Number.isFinite(bv) ? Math.round(bv * 100) / 100 : 0.6, f.id]; })
  .sort((a, b) => a[2] - b[2]);
fs.writeFileSync(out, '// GÉNÉRÉ par tools/make-stars.mjs (d3-celestial, BSD-3 ; Hipparcos / Yale Bright Star) : ne pas éditer.\n// [ascension droite (°), déclinaison (°), magnitude, B−V, numéro Hipparcos], de la plus brillante à la plus faible\nexport const STARS = ' + JSON.stringify(stars) + ';\n');
console.log(stars.length + ' étoiles (magnitude ' + stars[0][2] + ' à ' + stars[stars.length - 1][2] + ') → ' + out);

// noms propres et désignations (d3-celestial, starnames.json, BSD-3) → src/engine/data/star-names.js : { numéro Hipparcos: [nom propre, lettre grecque de Bayer, abréviation UAI de la constellation] } pour les étoiles qui ont un nom ou une lettre de Bayer
const namesCache = path.join(root, 'tools', '.cache', 'starnames.json'), namesOut = path.join(root, 'src', 'engine', 'data', 'star-names.js');
if (!fs.existsSync(namesCache)) {
  const r = await fetch('https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/starnames.json');
  if (!r.ok) throw new Error('téléchargement des noms : ' + r.status);
  fs.writeFileSync(namesCache, Buffer.from(await r.arrayBuffer()));
}
const raw = JSON.parse(fs.readFileSync(namesCache, 'utf8')), have = new Set(stars.map(s => String(s[4]))), names = {};
for (const hip of Object.keys(raw)) { const n = raw[hip]; if (have.has(hip) && (n.name || n.bayer) && n.c) names[hip] = [n.name || '', n.bayer || '', n.c]; }
fs.writeFileSync(namesOut, '// GÉNÉRÉ par tools/make-stars.mjs (d3-celestial starnames.json, BSD-3) : ne pas éditer.\n// { numéro Hipparcos: [nom propre, lettre de Bayer, constellation (abréviation UAI)] }\nexport const STAR_NAMES = ' + JSON.stringify(names) + ';\n');
console.log(Object.keys(names).length + ' étoiles nommées ou désignées → ' + namesOut);
