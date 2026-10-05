// Fond de carte dessiné PRÉCIS de la Terre, en tuiles : Natural Earth I haute résolution (NE1_HR_LC_SR_W, 21600 × 10800, 1,85 km/pixel, relief ombré, eau, glaciers), DOMAINE PUBLIC, https://www.naturalearthdata.com/
// télécharge la mosaïque (323 Mo, dans tools/.cache, ignoré par git), la découpe en 8 colonnes × 4 lignes de 45° × 45° (2048 × 2048 px chacune, ≈ 2,4 km/pixel) → public/data/earth/t-<colonne>-<ligne>.jpg
// (colonne 0 = longitudes −180…−135°, ligne 0 = latitudes 90…45° ; le moteur les charge à la demande sous 1 600 km d'altitude : src/engine/earth.js, EARTH_TILES)
// node tools/make-earth-tiles.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), cache = path.join(root, 'tools', '.cache'), zip = path.join(cache, 'NE1_HR_LC_SR_W.zip'), dir = path.join(cache, 'ne1hr');
const tif = path.join(dir, 'NE1_HR_LC_SR_W.tif'), out = path.join(root, 'public', 'data', 'earth');
const sharp = createRequire(import.meta.url)('sharp');
const COLS = 8, ROWS = 4, SIZE = 2048;
fs.mkdirSync(cache, { recursive: true }); fs.mkdirSync(out, { recursive: true });
if (!fs.existsSync(tif)) {
  if (!fs.existsSync(zip)) { const r = await fetch('https://naciscdn.org/naturalearth/10m/raster/NE1_HR_LC_SR_W.zip'); if (!r.ok) throw new Error('téléchargement : ' + r.status); fs.writeFileSync(zip, Buffer.from(await r.arrayBuffer())); }
  fs.mkdirSync(dir, { recursive: true }); execSync(`tar -xf "${zip}" -C "${dir}"`);
}
const meta = await sharp(tif, { limitInputPixels: false }).metadata(), tw = meta.width / COLS, th = meta.height / ROWS;
let total = 0;
for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
  const file = path.join(out, `t-${c}-${r}.jpg`);
  await sharp(tif, { limitInputPixels: false }).extract({ left: Math.round(c * tw), top: Math.round(r * th), width: Math.round(tw), height: Math.round(th) }).resize(SIZE, SIZE).jpeg({ quality: 82 }).toFile(file);
  total += fs.statSync(file).size;
}
console.log(COLS * ROWS + ' tuiles dans ' + out + ' : ' + Math.round(total / 1024 / 1024) + ' Mo');
