// Constellations (option « Constellations » : traits qui relient les étoiles, noms en français) : 88 constellations de l'UAI, tracés et noms de d3-celestial (https://github.com/ofrohn/d3-celestial, licence BSD-3).
// télécharge data/constellations.lines.json (tracés) et data/constellations.json (noms, position de l'étiquette) dans tools/.cache et écrit src/engine/data/constellations.js :
// [[abréviation UAI, nom en français, [α étiquette °, δ étiquette °], [[[α, δ], …], …]], …] (α en degrés 0 à 360).
// node tools/make-constellations.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), cacheDir = path.join(root, 'tools', '.cache'), out = path.join(root, 'src', 'engine', 'data', 'constellations.js');
const get = async name => {
  const f = path.join(cacheDir, name);
  if (!fs.existsSync(f)) { fs.mkdirSync(cacheDir, { recursive: true }); const r = await fetch('https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/' + name); if (!r.ok) throw new Error(name + ' : ' + r.status); fs.writeFileSync(f, Buffer.from(await r.arrayBuffer())); }
  return JSON.parse(fs.readFileSync(f, 'utf8'));
};
const lines = await get('constellations.lines.json'), names = await get('constellations.json');
const ra = lon => Math.round((((lon % 360) + 360) % 360) * 100) / 100, r2 = x => Math.round(x * 100) / 100;
const meta = new Map(names.features.map(f => [f.id, f]));
const list = lines.features.map(f => {
  const m = meta.get(f.id), p = m ? m.properties : {}, c = m && m.geometry && m.geometry.type === 'Point' ? m.geometry.coordinates : null, segs = f.geometry.coordinates.map(l => l.map(([lon, lat]) => [ra(lon), r2(lat)]));
  const first = segs[0][0];
  return [f.id, String(p.fr || p.en || f.id).replace(/[\s\u2000-\u200b\u00a0]+/g, ' ').trim(), c ? [ra(c[0]), r2(c[1])] : first, segs];
});
fs.writeFileSync(out, '// GÉNÉRÉ par tools/make-constellations.mjs (d3-celestial, BSD-3) : ne pas éditer.\n// [abréviation UAI, nom en français, [α étiquette (°), δ étiquette (°)], [tracés : [[α, δ], …], …]]\nexport const CONSTELLATIONS = ' + JSON.stringify(list) + ';\n');
const nSeg = list.reduce((a, c) => a + c[3].reduce((b, l) => b + l.length - 1, 0), 0);
console.log(list.length + ' constellations, ' + nSeg + ' traits → ' + out);
