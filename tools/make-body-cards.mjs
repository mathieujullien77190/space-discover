// Fabrique les illustrations des fiches d'astres : public/objects/<astre>/card.png (360 × 360, fond transparent).
// Terre et Lune : les MÊMES textures peintes que dans la scène (peintres du moteur, src/engine/earth.js et moon.js, exécutés sur un canvas Node), Mars : sa carte dessinée (mars.jpg),
// projetées sur un disque (projection orthographique) et ombrées en aplats (5 niveaux : un « dessin », pas une photo). Soleil et comète de Halley : dessinés directement.
// Usage : node tools/make-body-cards.mjs   (npm i -D @napi-rs/canvas déjà fait)
import { createCanvas, loadImage } from '@napi-rs/canvas';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), S = 360, DEG = Math.PI / 180;
globalThis.document = { createElement: () => createCanvas(1, 1) };   // les peintres du moteur demandent un canvas au DOM
const { paintEarthTexture } = await import('../src/engine/earth.js');
const { paintMoonTexture } = await import('../src/engine/moon.js');

const LEVELS = [0.42, 0.58, 0.76, 0.92, 1.05];   // ombrage en aplats
const L = (() => { const v = [-0.55, 0.55, 0.65], n = Math.hypot(...v); return v.map(x => x / n); })();
// carte équirectangulaire (canvas ou image) → disque ombré ; (lon0, lat0) = point au centre du disque
const disc = (map, lon0, lat0, rim = 'rgba(0,0,0,0.55)') => {
  const mw = map.width, mh = map.height, mc = createCanvas(mw, mh), mg = mc.getContext('2d'); mg.drawImage(map, 0, 0);
  const src = mg.getImageData(0, 0, mw, mh).data, out = createCanvas(S, S), g = out.getContext('2d'), img = g.createImageData(S, S), la0 = lat0 * DEG;
  for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
    const nx = (px + 0.5) / S * 2 - 1, ny = 1 - (py + 0.5) / S * 2, r2 = nx * nx + ny * ny; if (r2 > 1) continue;
    const nz = Math.sqrt(1 - r2), lat = Math.asin(nz * Math.sin(la0) + ny * Math.cos(la0)) / DEG, lon = lon0 + Math.atan2(nx, nz * Math.cos(la0) - ny * Math.sin(la0)) / DEG;
    const u = (((lon + 180) / 360) % 1 + 1) % 1, v = Math.min(0.9999, Math.max(0, (90 - lat) / 180)), si = (Math.floor(v * mh) * mw + Math.floor(u * mw)) * 4;
    const d = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]), k = LEVELS[Math.min(4, Math.floor(d * 5))], o = (py * S + px) * 4;
    img.data[o] = Math.min(255, src[si] * k); img.data[o + 1] = Math.min(255, src[si + 1] * k); img.data[o + 2] = Math.min(255, src[si + 2] * k); img.data[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  g.lineWidth = 3; g.strokeStyle = rim; g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 1.5, 0, 2 * Math.PI); g.stroke();   // contour : style dessin
  return out;
};
const save = (id, canvas) => { const p = path.join(root, 'public', 'objects', id, 'card.png'); fs.writeFileSync(p, canvas.toBuffer('image/png')); console.log(id, (fs.statSync(p).size / 1e3).toFixed(0), 'Ko'); };

save('earth', disc(paintEarthTexture(2048, 1024), 15, 20));
save('moon', disc(paintMoonTexture(2048, 1024), 0, 8));
save('mars', disc(await loadImage(fs.readFileSync(path.join(root, 'public', 'objects', 'mars', 'mars.jpg'))), -70, -2));

{ // Soleil : disque en bandes concentriques (aplats), granulation par quelques taches
  const c = createCanvas(S, S), g = c.getContext('2d');
  [['#ffb21e', 1], ['#ffc83a', 0.82], ['#ffdf6b', 0.58], ['#fff1b0', 0.3]].forEach(([col, r]) => { g.fillStyle = col; g.beginPath(); g.arc(S / 2, S / 2, S / 2 * r - 1, 0, 2 * Math.PI); g.fill(); });
  g.fillStyle = 'rgba(255,140,0,0.35)'; [[110, 120, 16], [240, 90, 12], [260, 230, 18], [130, 260, 10], [200, 170, 8]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, 2 * Math.PI); g.fill(); });
  g.lineWidth = 3; g.strokeStyle = 'rgba(160,70,0,0.6)'; g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 1.5, 0, 2 * Math.PI); g.stroke();
  save('sun', c);
}
{ // comète de Halley : noyau sombre irrégulier, coma, queue courbe
  const c = createCanvas(S, S), g = c.getContext('2d');
  const tail = (w, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(250, 250); g.bezierCurveTo(180, 220, 90, 150, 12, 40); g.bezierCurveTo(70, 150, 150, 250, 250, 250 + w); g.closePath(); g.fill(); };
  tail(40, 'rgba(160,215,255,0.35)'); tail(18, 'rgba(200,235,255,0.55)');
  g.fillStyle = 'rgba(210,235,255,0.5)'; g.beginPath(); g.arc(250, 250, 46, 0, 2 * Math.PI); g.fill();
  g.fillStyle = '#e8f3ff'; g.beginPath(); g.arc(250, 250, 30, 0, 2 * Math.PI); g.fill();
  g.fillStyle = '#4a4540'; g.beginPath(); g.ellipse(250, 250, 15, 9, -0.5, 0, 2 * Math.PI); g.fill();
  g.lineWidth = 2; g.strokeStyle = '#2a2622'; g.stroke();
  save('halley', c);
}

{ // ISS : poutre centrale, 4 paires de panneaux solaires, radiateurs, modules pressurisés (dessin plat)
  const c = createCanvas(S, S), g = c.getContext('2d'), line = '#1c2430';
  const rect = (x, y, w, h, fill) => { g.fillStyle = fill; g.fillRect(x, y, w, h); g.lineWidth = 2; g.strokeStyle = line; g.strokeRect(x, y, w, h); };
  rect(14, 176, 332, 8, '#b9bec9');   // poutre
  for (const x of [34, 84, 246, 296]) { for (const y of [28, 206]) { rect(x, y, 34, 126, '#2d5fa8'); for (let k = 1; k < 5; k++) { g.beginPath(); g.moveTo(x, y + k * 25); g.lineTo(x + 34, y + k * 25); g.strokeStyle = '#8fb6ea'; g.lineWidth = 1; g.stroke(); } } }
  rect(150, 40, 18, 70, '#f1f3f6'); rect(150, 250, 18, 70, '#f1f3f6'); rect(192, 40, 18, 70, '#f1f3f6'); rect(192, 250, 18, 70, '#f1f3f6');   // radiateurs
  rect(110, 168, 140, 24, '#d6d9df'); rect(104, 164, 10, 32, '#caa24a'); rect(246, 164, 10, 32, '#caa24a');   // modules
  rect(168, 150, 24, 60, '#e4e6ea'); g.fillStyle = '#caa24a'; g.fillRect(172, 142, 16, 8); g.fillRect(172, 210, 16, 8);
  save('iss', c);
}

{ // Hubble : tube argenté, ouverture sombre, couronne arrière, deux panneaux solaires bleus (dessin plat, vu de côté)
  const c = createCanvas(S, S), g = c.getContext('2d'), line = '#1c2430';
  const rect = (x, y, w, h, fill) => { g.fillStyle = fill; g.fillRect(x, y, w, h); g.lineWidth = 2; g.strokeStyle = line; g.strokeRect(x, y, w, h); };
  for (const y of [18, 238]) { rect(108, y, 150, 104, '#2d5fa8'); for (let k = 1; k < 6; k++) { g.beginPath(); g.moveTo(108 + k * 25, y); g.lineTo(108 + k * 25, y + 104); g.strokeStyle = '#8fb6ea'; g.lineWidth = 1; g.stroke(); } rect(176, y < 100 ? y + 104 : y - 26, 14, 26, '#555a66'); }   // panneaux + mâts
  rect(40, 142, 252, 76, '#d9dce2');          // tube principal
  rect(292, 134, 44, 92, '#e8e9ec');          // pare-soleil
  rect(332, 148, 8, 64, '#0b0c10');           // ouverture sombre
  rect(14, 136, 40, 88, '#8a8f9a');           // couronne arrière (instruments)
  g.strokeStyle = '#c8ccd4'; g.lineWidth = 3; g.beginPath(); g.moveTo(70, 142); g.lineTo(70, 110); g.moveTo(58, 110); g.lineTo(82, 110); g.stroke();   // antenne
  save('hubble', c);
}
