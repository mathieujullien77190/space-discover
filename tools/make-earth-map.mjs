// Fond de carte « dessiné » de la Terre : Natural Earth I (relief ombré, eau, drainages), DOMAINE PUBLIC, https://www.naturalearthdata.com/
// télécharge la mosaïque 50 m (10800 × 5400, 88 Mo, dans tools/.cache, ignoré par git), la ramène à 8192 × 4096 (JPEG, ≈ 5 Mo) → public/data/earth-drawn.jpg
// node tools/make-earth-map.mjs
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), cache = path.join(root, 'tools', '.cache'), zip = path.join(cache, 'NE1_50M_SR_W.zip'), dir = path.join(cache, 'ne1');
const tif = path.join(dir, 'NE1_50M_SR_W', 'NE1_50M_SR_W.tif'), out = path.join(root, 'public', 'data', 'earth-drawn.jpg');
fs.mkdirSync(cache, { recursive: true });
if (!fs.existsSync(tif)) {
  if (!fs.existsSync(zip)) { const r = await fetch('https://naciscdn.org/naturalearth/50m/raster/NE1_50M_SR_W.zip'); if (!r.ok) throw new Error('téléchargement : ' + r.status); fs.writeFileSync(zip, Buffer.from(await r.arrayBuffer())); }
  fs.mkdirSync(dir, { recursive: true }); execSync(`tar -xf "${zip}" -C "${dir}"`);
}
execSync(`npx --yes sharp-cli -i "${tif}" -o "${out}" resize 8192 4096 --format jpeg --quality 86`, { stdio: 'inherit' });
console.log('écrit :', out, Math.round(fs.statSync(out).size / 1024) + ' Ko');
