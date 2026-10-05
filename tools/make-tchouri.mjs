// Fabrique l'objet « Tchouri » (67P/Tchourioumov-Guérassimenko) : public/objects/tchouri/tchouri.json + card.png (illustration dessinée d'après le VRAI maillage).
// Modèle 3D : tchouri.obj = modèle de forme de la comète 67P, ESA/Rosetta/MPS for OSIRIS Team MPS/UPD/LAM/IAA/SSO/INTA/UPM/DASP/IDA, licence CC BY-SA 3.0 IGO
//   (https://sci.esa.int/web/rosetta/-/54728-shape-model-of-comet-67p ; téléchargé le 2026-10-05, voir public/objects/tchouri/CREDITS.md).
// Échelle du fichier : calée sur le volume de la comète (18,7 km³, de mémoire) : kmPerUnit = ∛(18,7 / volume du maillage).
// Éléments orbitaux et rotation de MÉMOIRE (à vérifier). Usage : node tools/make-tchouri.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas } from '@napi-rs/canvas';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), dir = path.join(root, 'public', 'objects', 'tchouri'), S = 360, AU = 149597870.7;
const obj = fs.readFileSync(path.join(dir, 'tchouri.obj'), 'utf8'), V = [], F = [];
for (const l of obj.split('\n')) { const p = l.trim().split(/\s+/); if (p[0] === 'v') V.push([+p[1], +p[2], +p[3]]); else if (p[0] === 'f') F.push(p.slice(1).map(x => parseInt(x, 10) - 1)); }
let vol = 0; for (const [a, b, c] of F) { const A = V[a], B = V[b], C = V[c]; vol += (A[0] * (B[1] * C[2] - B[2] * C[1]) - A[1] * (B[0] * C[2] - B[2] * C[0]) + A[2] * (B[0] * C[1] - B[1] * C[0])) / 6; }
const kmPerUnit = +Math.cbrt(18.7 / Math.abs(vol)).toFixed(4);
const ext = [0, 1, 2].map(i => Math.max(...V.map(v => v[i])) - Math.min(...V.map(v => v[i]))).map(e => +(e * kmPerUnit).toFixed(2));
console.log('sommets', V.length, 'triangles', F.length, 'volume', vol.toFixed(4), '→ kmPerUnit', kmPerUnit, 'boîte', ext.join(' × '), 'km');

// ---------- JSON ----------
const perihelionD = (Date.UTC(2021, 10, 2, 13, 0) - Date.UTC(2000, 0, 1, 12, 0)) / 86400000;   // périhélie du 2 novembre 2021 (de mémoire) : anomalie moyenne 0
const NOTE = "Éléments orbitaux, rotation (pôle α0 = 69,3°, δ0 = 64,1° ; période 12,4 h), masse, dimensions et faits ÉCRITS DE MÉMOIRE (à vérifier). Le maillage est le modèle de forme de l'ESA (CC BY-SA 3.0 IGO) ; son échelle est calée sur le volume 18,7 km³. L'angle du méridien origine W0 est arbitraire.";
const json = {
  kind: 'body', bodyType: 'comet', name: '67P/Tchourioumov-Guérassimenko (Tchouri)', radiusKm: 2, massKg: 9.98e12, around: 'sun',
  motion: { frame: 'heliocentric', model: 'kepler', semiMajorAxisKm: Math.round(3.463 * AU), eccentricity: 0.641, inclinationDeg: 7.04, nodeDeg: 50.14, argPerigeeDeg: 12.78, meanAnomalyDeg: 0, epochD2000: +perihelionD.toFixed(1), periodDays: 2354 },
  appearance: { kind: 'mesh', model: 'tchouri.obj', kmPerUnit, color: '#7d7469', tail: { color: '#bfe3ff', lengthKmAt1AU: 4000000, widthKm: 300000 } },
  rotation: { _note: NOTE, poleRaDeg: 69.3, poleDecDeg: 64.1, w0Deg: 0, rateDegPerDay: +(360 / (12.4 / 24)).toFixed(3) },
  trace: { fullOrbit: true, color: '#9fd0ff' }, dot: { color: '#bfe3ff', minDistanceUnits: 0 },
  label: { text: 'Tchouri', metricText: 'Tchouri · noyau ≈ {diameterKm} km', minDistanceUnits: 0.0005 },
  menu: { order: 5.01, icon: '☄', view: { distanceUnits: 0.0035, text: 'Vue de la comète 67P/Tchourioumov-Guérassimenko : modèle de forme de l’ESA (mission Rosetta), orbite de 6,4 ans, queue à l’opposé du Soleil' } },
  card: { _note: NOTE, image: 'card.png', nearUnits: 0.03, facts: [['Forme', 'deux lobes : « canard en plastique »'], ['Dimensions', 'grand lobe 4,1 × 3,3 × 1,8 km, petit lobe 2,6 × 2,3 × 1,8 km'], ['Rotation', '12,4 heures'], ['Densité', '≈ 0,53 g/cm³ (très poreuse)'], ['Mission', 'Rosetta (ESA) en orbite de 2014 à 2016'], ['Atterrisseur', 'Philae, posé le 12 novembre 2014'], ['Dernier périhélie', 'novembre 2021']].map(([label, value]) => ({ label, value })) },
};
fs.writeFileSync(path.join(dir, 'tchouri.json'), JSON.stringify(json, null, 2) + '\n');

// ---------- illustration : rendu logiciel du maillage (z-buffer, ombrage en 5 aplats) ----------
const yaw = 0.5, pitch = 0.45, cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
const rot = v => { const x = v[0] * cy + v[2] * sy, z = -v[0] * sy + v[2] * cy, y = v[1] * cp - z * sp, z2 = v[1] * sp + z * cp; return [x, y, z2]; };
const R = V.map(rot), lo = [0, 1].map(i => Math.min(...R.map(v => v[i]))), hi = [0, 1].map(i => Math.max(...R.map(v => v[i]))), scale = 0.9 * S / Math.max(hi[0] - lo[0], hi[1] - lo[1]);
const sx = v => (v[0] - (lo[0] + hi[0]) / 2) * scale + S / 2, sy2 = v => S / 2 - (v[1] - (lo[1] + hi[1]) / 2) * scale;
const c = createCanvas(S, S), g = c.getContext('2d'), img = g.createImageData(S, S), zb = new Float32Array(S * S).fill(-1e9), LEV = [0.35, 0.55, 0.75, 0.95, 1.1], base = [150, 140, 128], light = [-0.5, 0.6, 0.62];
const ln = Math.hypot(...light); for (let i = 0; i < 3; i++) light[i] /= ln;
for (const [ia, ib, ic] of F) {
  const A = R[ia], B = R[ib], C = R[ic], ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2];
  let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl; if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
  const d = Math.max(0, nx * light[0] + ny * light[1] + nz * light[2]), k = LEV[Math.min(4, Math.floor(d * 5))];
  const x0 = sx(A), y0 = sy2(A), x1 = sx(B), y1 = sy2(B), x2 = sx(C), y2 = sy2(C), den = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2); if (Math.abs(den) < 1e-9) continue;
  for (let py = Math.max(0, Math.floor(Math.min(y0, y1, y2))); py <= Math.min(S - 1, Math.ceil(Math.max(y0, y1, y2))); py++) for (let px = Math.max(0, Math.floor(Math.min(x0, x1, x2))); px <= Math.min(S - 1, Math.ceil(Math.max(x0, x1, x2))); px++) {
    const l1 = ((y1 - y2) * (px + 0.5 - x2) + (x2 - x1) * (py + 0.5 - y2)) / den, l2 = ((y2 - y0) * (px + 0.5 - x2) + (x0 - x2) * (py + 0.5 - y2)) / den, l3 = 1 - l1 - l2; if (l1 < 0 || l2 < 0 || l3 < 0) continue;
    const z = l1 * A[2] + l2 * B[2] + l3 * C[2], o = py * S + px; if (z <= zb[o]) continue; zb[o] = z;
    img.data[o * 4] = Math.min(255, base[0] * k); img.data[o * 4 + 1] = Math.min(255, base[1] * k); img.data[o * 4 + 2] = Math.min(255, base[2] * k); img.data[o * 4 + 3] = 255;
  }
}
g.putImageData(img, 0, 0);
fs.writeFileSync(path.join(dir, 'card.png'), c.toBuffer('image/png'));
fs.writeFileSync(path.join(dir, 'CREDITS.md'), "# Tchouri — crédits\n\n`tchouri.obj` : modèle de forme de la comète 67P/Tchourioumov-Guérassimenko.\n\n- Crédit : **ESA/Rosetta/MPS for OSIRIS Team MPS/UPD/LAM/IAA/SSO/INTA/UPM/DASP/IDA**\n- Licence : **Creative Commons Attribution-ShareAlike 3.0 IGO (CC BY-SA 3.0 IGO)** : réutilisation libre avec mention du crédit, les dérivés du modèle restent sous la même licence.\n- Source : https://sci.esa.int/web/rosetta/-/54728-shape-model-of-comet-67p (téléchargé le 2026-10-05)\n- Échelle (`kmPerUnit` dans `tchouri.json`) calée sur le volume de la comète (18,7 km³) ; l'illustration `card.png` est un rendu de ce modèle (tools/make-tchouri.mjs).\n");
console.log('tchouri.json, card.png, CREDITS.md écrits');
