// Illustration de la fiche de l'observatoire du Pic du Midi (dessin : ciel étoilé du soir, montagne enneigée, dôme et antenne) → public/data/observatories/pic-du-midi.png (192 × 192)
// node tools/make-observatory-card.mjs
import { createCanvas } from '@napi-rs/canvas';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), out = path.join(root, 'public', 'data', 'observatories', 'pic-du-midi.png'), S = 192;
const cv = createCanvas(S, S), g = cv.getContext('2d');
const sky = g.createLinearGradient(0, 0, 0, S); sky.addColorStop(0, '#0a1230'); sky.addColorStop(0.65, '#2b3f7a'); sky.addColorStop(1, '#e49a6a');
g.fillStyle = sky; g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); g.fill();
g.save(); g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); g.clip();
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
for (let i = 0; i < 70; i++) { g.fillStyle = 'rgba(255,255,255,' + (0.4 + rnd() * 0.6) + ')'; g.fillRect(rnd() * S, rnd() * S * 0.55, 1.5, 1.5); }
const peak = (pts, c1, c2) => { const f = g.createLinearGradient(0, 70, 0, S); f.addColorStop(0, c1); f.addColorStop(1, c2); g.fillStyle = f; g.beginPath(); g.moveTo(0, S); for (const [x, y] of pts) g.lineTo(x, y); g.lineTo(S, S); g.closePath(); g.fill(); };
peak([[0, 128], [30, 112], [55, 124], [85, 96], [112, 118], [140, 104], [170, 122], [S, 112]], '#5a6a96', '#2a3358');   // chaîne lointaine
peak([[0, 150], [40, 132], [78, 142], [104, 80], [126, 140], [150, 128], [S, 148]], '#f4f6ff', '#7d88b6');                   // pic enneigé
g.fillStyle = '#e8ecf8'; g.fillRect(100, 52, 8, 30);                                                                        // tour
g.fillStyle = '#c9d0e6'; g.beginPath(); g.arc(104, 56, 11, Math.PI, 0); g.fill(); g.fillRect(93, 56, 22, 9);                  // dôme
g.fillStyle = '#ffd54a'; g.fillRect(100, 58, 3, 4);                                                                         // fenêtre éclairée
g.strokeStyle = '#e8ecf8'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(104, 45); g.lineTo(104, 30); g.moveTo(98, 36); g.lineTo(110, 36); g.stroke();   // antenne
peak([[0, 178], [60, 164], [120, 172], [S, 160]], '#1b2140', '#0d1020');
g.restore();
g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 2; g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); g.stroke();
fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, cv.toBuffer('image/png'));
console.log('écrit :', out, Math.round(fs.statSync(out).size / 1024) + ' Ko');

// Illustrations des autres observatoires : même cadre rond, décor selon `scene` (snow : sommet enneigé au crépuscule ; desert : dunes ocre et ciel étoilé ; forest : colline boisée), un dôme et une antenne.
import { OBSERVATORIES } from '../src/engine/observatories.js';
import { MOON_SITES } from '../src/engine/moon-sites.js';
const PAL = {
  snow: { sky: ['#0a1230', '#2b3f7a', '#e49a6a'], far: ['#5a6a96', '#2a3358'], near: ['#f4f6ff', '#7d88b6'], front: ['#1b2140', '#0d1020'] },
  desert: { sky: ['#060b22', '#27306a', '#f0a86a'], far: ['#9a6a58', '#4a3040'], near: ['#e7b27a', '#8a5a44'], front: ['#3a2430', '#1a1018'] },
  moon: { sky: ['#000000', '#04050a', '#10121a'], far: ['#77746f', '#3a3937'], near: ['#a09d98', '#55534f'], front: ['#2c2b29', '#151413'] },
  forest: { sky: ['#0a1432', '#2a4a7a', '#e8a070'], far: ['#4a6a7a', '#233848'], near: ['#4f7a52', '#1f3a2c'], front: ['#14261c', '#0a140e'] },
};
[...OBSERVATORIES.filter(o => o.id !== 'pic-du-midi'), ...MOON_SITES].forEach((o, n) => {
  const p = PAL[o.scene] || PAL.snow, c = createCanvas(S, S), k = c.getContext('2d');
  const sk = k.createLinearGradient(0, 0, 0, S); sk.addColorStop(0, p.sky[0]); sk.addColorStop(0.65, p.sky[1]); sk.addColorStop(1, p.sky[2]);
  k.fillStyle = sk; k.beginPath(); k.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); k.fill();
  k.save(); k.beginPath(); k.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); k.clip();
  let sd = 11 + n * 5; const rd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 70; i++) { k.fillStyle = 'rgba(255,255,255,' + (0.4 + rd() * 0.6) + ')'; k.fillRect(rd() * S, rd() * S * 0.55, 1.5, 1.5); }
  const ridge = (pts, c1, c2) => { const f = k.createLinearGradient(0, 70, 0, S); f.addColorStop(0, c1); f.addColorStop(1, c2); k.fillStyle = f; k.beginPath(); k.moveTo(0, S); for (const [x, y] of pts) k.lineTo(x, y); k.lineTo(S, S); k.closePath(); k.fill(); };
  ridge([[0, 128], [30, 116], [55, 126], [85, 104], [112, 122], [140, 110], [170, 124], [S, 116]], p.far[0], p.far[1]);
  ridge([[0, 150], [40, 138], [78, 146], [104, 96], [126, 144], [150, 132], [S, 150]], p.near[0], p.near[1]);
  if (o.scene === 'moon') {   // Lune : la Terre dans le ciel noir, un drapeau planté sur le sol
    k.fillStyle = '#2f6fd0'; k.beginPath(); k.arc(130, 40, 17, 0, Math.PI * 2); k.fill(); k.fillStyle = '#f1f6ff'; k.fillRect(122, 33, 12, 4); k.fillRect(126, 44, 14, 3);
    k.fillStyle = '#05060a'; k.beginPath(); k.arc(142, 40, 14, -Math.PI / 2, Math.PI / 2); k.fill();   // la Terre en croissant
    k.strokeStyle = '#cfd3d8'; k.lineWidth = 2; k.beginPath(); k.moveTo(86, 148); k.lineTo(86, 84); k.stroke();
    k.fillStyle = '#b22234'; k.fillRect(86, 84, 34, 22); k.fillStyle = '#ffffff'; for (let i = 1; i < 7; i += 2) k.fillRect(86, 84 + i * 3.1, 34, 3.1); k.fillStyle = '#3c3b6e'; k.fillRect(86, 84, 14, 12);
  } else {
  k.fillStyle = '#e8ecf8'; k.fillRect(100, 68, 8, 20); k.fillStyle = '#c9d0e6'; k.beginPath(); k.arc(104, 72, 11, Math.PI, 0); k.fill(); k.fillRect(93, 72, 22, 9);
  k.fillStyle = '#ffd54a'; k.fillRect(100, 74, 3, 4);
  k.strokeStyle = '#e8ecf8'; k.lineWidth = 1.5; k.beginPath(); k.moveTo(104, 61); k.lineTo(104, 46); k.moveTo(98, 52); k.lineTo(110, 52); k.stroke();
  }
  ridge([[0, 178], [60, 166], [120, 174], [S, 162]], p.front[0], p.front[1]);
  k.restore();
  k.strokeStyle = 'rgba(255,255,255,0.4)'; k.lineWidth = 2; k.beginPath(); k.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); k.stroke();
  fs.writeFileSync(path.join(path.dirname(out), o.id + '.png'), c.toBuffer('image/png'));
});
console.log('illustrations des autres observatoires écrites');
