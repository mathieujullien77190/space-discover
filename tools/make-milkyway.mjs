// Étoiles de fond de la VOIE LACTÉE : ≈ 20 000 points répartis selon le VRAI contour de la Voie lactée (cinq niveaux de luminosité tracés d'après des relevés du ciel : d3-celestial, milkyway.json, licence BSD-3).
// Les contours (polygones en ascension droite / déclinaison J2000) sont remplis sur une grille de 0,25° (règle pair / impair : les « trous » et les îlots sont respectés) ; le niveau de luminosité du pixel (0 à 5)
// fixe la densité de points (probabilité ∝ (niveau / 5)^3,2 × cos(déclinaison)) ; chaque point reçoit une luminosité tirée au hasard (beaucoup de faibles, peu de brillants).
// Écrit src/engine/data/milkyway-points.js : { N, base64 } avec 5 octets par point : α (16 bits), δ (16 bits), luminosité (8 bits).
// node tools/make-milkyway.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), cache = path.join(root, 'tools', '.cache', 'milkyway.json'), out = path.join(root, 'src', 'engine', 'data', 'milkyway-points.js');
if (!fs.existsSync(cache)) {
  fs.mkdirSync(path.dirname(cache), { recursive: true });
  const r = await fetch('https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/milkyway.json');
  if (!r.ok) throw new Error('téléchargement : ' + r.status);
  fs.writeFileSync(cache, Buffer.from(await r.arrayBuffer()));
}
const features = JSON.parse(fs.readFileSync(cache, 'utf8')).features;
const W = 1440, H = 720, STEP = 0.25, N = 20000, DEG = Math.PI / 180;
const level = new Uint8Array(W * H);   // nombre de contours (0 à 5) qui contiennent le pixel
// les anneaux qui franchissent le méridien ±180° sautent de +179° à −179° : on les rend continus (longitudes cumulées) puis on les remplit aussi décalés de ±360°
const unwrap = ring => { const out = [ring[0].slice()]; for (let i = 1; i < ring.length; i++) { let x = ring[i][0]; const prev = out[i - 1][0]; while (x - prev > 180) x -= 360; while (x - prev < -180) x += 360; out.push([x, ring[i][1]]); } return out; };
// remplissage par balayage (pair / impair) d'un polygone à plusieurs anneaux ; coordonnées [lon (−180…180), lat]
for (const f of features) {
  const rings = f.geometry.coordinates.map(unwrap), fill = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    const lat = 90 - (y + 0.5) * STEP, xs = [];
    for (const ring of rings) for (let i = 0; i < ring.length; i++) {
      const [x1, y1] = ring[i], [x2, y2] = ring[(i + 1) % ring.length];
      if ((y1 <= lat && y2 > lat) || (y2 <= lat && y1 > lat)) { const x = x1 + (lat - y1) / (y2 - y1) * (x2 - x1); xs.push(x, x - 360, x + 360); }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const x0 = Math.max(0, Math.ceil((xs[k] + 180) / STEP - 0.5)), x1 = Math.min(W - 1, Math.floor((xs[k + 1] + 180) / STEP - 0.5));
      for (let x = x0; x <= x1; x++) fill[y * W + x] = 1;
    }
  }
  for (let i = 0; i < W * H; i++) level[i] += fill[i];
}
// loi de probabilité cumulée sur la grille
const cum = new Float64Array(W * H); let total = 0;
for (let y = 0; y < H; y++) { const c = Math.cos((90 - (y + 0.5) * STEP) * DEG); for (let x = 0; x < W; x++) { const l = level[y * W + x]; total += l ? Math.pow(l / 5, 3.2) * c : 0; cum[y * W + x] = total; } }
let seed = 20261005; const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const buf = Buffer.alloc(N * 5);
for (let i = 0; i < N; i++) {
  const t = rand() * total; let lo = 0, hi = W * H - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < t) lo = m + 1; else hi = m; }
  const y = Math.floor(lo / W), x = lo % W;
  const lon = -180 + (x + rand()) * STEP, lat = 90 - (y + rand()) * STEP, ra = ((lon % 360) + 360) % 360;
  buf.writeUInt16LE(Math.min(65535, Math.round(ra / 360 * 65536) % 65536), i * 5); buf.writeUInt16LE(Math.max(0, Math.min(65535, Math.round((lat + 90) / 180 * 65535))), i * 5 + 2);
  const u = rand(); buf[i * 5 + 4] = Math.round(255 * (0.12 + 0.88 * Math.pow(u, 3)));
}
fs.writeFileSync(out, '// GÉNÉRÉ par tools/make-milkyway.mjs (contours de la Voie lactée : d3-celestial, BSD-3) : ne pas éditer.\n// ' + N + ' points : 5 octets chacun (α 16 bits sur 0–360°, δ 16 bits sur −90…+90°, luminosité 8 bits), en base64.\nexport const MILKY_POINTS_N = ' + N + ';\nexport const MILKY_POINTS_B64 = "' + buf.toString('base64') + '";\n');
const covered = level.reduce((s, v) => s + (v ? 1 : 0), 0);
console.log('grille ' + W + '×' + H + ' : ' + covered + ' pixels dans la Voie lactée (' + (100 * covered / (W * H)).toFixed(1) + ' % de la carte), ' + N + ' points → ' + out + ' (' + Math.round(fs.statSync(out).size / 1024) + ' Ko)');
