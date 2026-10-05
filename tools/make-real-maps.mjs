// Cartes RÉELLES stylisées : même traitement que la carte de Mars (tools/make-mars-map.js) appliqué aux mosaïques de la NASA / USGS téléchargées par tools/fetch-maps.mjs :
// la luminance est lissée puis classée en 4 teintes (aplats), les zones sans données (noires) sont remplies avec une teinte moyenne. Écrit public/objects/<astre>/<astre>.jpg.
// Usage : node tools/fetch-maps.mjs && node tools/make-real-maps.mjs [id ...] && node tools/make-planets.mjs   (les fiches sont refaites d'après ces cartes)
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOURCES } from './fetch-maps.mjs';

sharp.cache(false);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), cache = path.join(root, 'tools', '.cache');
const hex = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
// size : largeur de la carte écrite (hauteur = moitié) ; roll : décalage en longitude (fraction de la largeur) pour mettre 0° au centre ; blur : lissage (px) ; unknown : luminance en dessous de laquelle il n'y a pas de données ; fill : classe des zones sans données
const MAPS = {
  mercury: { size: 2048, blur: 5, q: [0.22, 0.52, 0.8], palette: ['#5f5952', '#847d74', '#a69e93', '#cbc3b6'] },
  europa: { size: 1024, blur: 3, q: [0.2, 0.5, 0.78], palette: ['#8b7058', '#c4b9a6', '#e1dbcd', '#f6f2e8'] },
  pluto: { size: 1024, blur: 3, q: [0.22, 0.5, 0.8], palette: ['#4a3028', '#8a634f', '#c8a68a', '#efe3d5'], unknown: 12, fill: 1, roll: 0.5 },
  titan: { size: 1024, blur: 4, q: [0.2, 0.5, 0.8], palette: ['#5a3416', '#a8661f', '#d99a3c', '#f0c27a'] },
};
const only = process.argv.slice(2);
for (const [id, o] of Object.entries(MAPS)) {
  if (only.length && !only.includes(id)) continue;
  const src = path.join(cache, id + path.extname(SOURCES[id])), W = o.size, H = W / 2;
  if (!fs.existsSync(src)) { console.log(id, ': source absente (node tools/fetch-maps.mjs)'); continue; }
  const grey = await sharp(src, { limitInputPixels: false }).resize(W, H, { fit: 'fill' }).greyscale().blur(o.blur).raw().toBuffer();
  const lum = new Float32Array(W * H); for (let i = 0; i < W * H; i++) lum[i] = grey[i];
  const vals = []; for (let i = 0; i < W * H; i += 5) if (!o.unknown || lum[i] > o.unknown) vals.push(lum[i]); vals.sort((a, b) => a - b);
  const T = o.q.map(p => vals[Math.floor(p * (vals.length - 1))]), pal = o.palette.map(hex), out = Buffer.alloc(W * H * 3), shift = Math.round((o.roll || 0) * W);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, cls = o.unknown && lum[i] <= o.unknown ? o.fill : (lum[i] < T[0] ? 0 : lum[i] < T[1] ? 1 : lum[i] < T[2] ? 2 : 3), j = (y * W + (x + shift) % W) * 3;
    out[j] = pal[cls][0]; out[j + 1] = pal[cls][1]; out[j + 2] = pal[cls][2];
  }
  await sharp(out, { raw: { width: W, height: H, channels: 3 } }).blur(0.7).jpeg({ quality: 88, mozjpeg: true }).toFile(path.join(root, 'public', 'objects', id, id + '.jpg'));
  console.log(id, 'seuils', T.map(v => v.toFixed(0)).join(' / '), '→', id + '.jpg');
}
