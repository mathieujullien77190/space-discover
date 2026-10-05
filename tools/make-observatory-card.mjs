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
