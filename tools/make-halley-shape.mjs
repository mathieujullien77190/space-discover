// Fabrique la forme du noyau de la comète de Halley : public/objects/halley/halley.obj + card.png, et met à jour halley.json (aspect « mesh »).
// ATTENTION : ce n'est PAS un modèle mesuré. La sonde Giotto (1986) a montré un noyau allongé en « cacahuète » d'environ 15,3 × 7,2 × 7,2 km (de mémoire) : on fabrique une forme APPROCHÉE
// (icosphère déformée : allongement, rétrécissement au milieu, un lobe plus gros que l'autre, bosses et creux de bruit fractal à graine fixe), unités du fichier = km.
// Usage : node tools/make-halley-shape.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rng, renderMeshCard } from './lib-body-art.mjs';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'objects', 'halley');
// ---------- icosphère (subdivision 4 : 5 120 triangles) ----------
const t = (1 + Math.sqrt(5)) / 2;
let V = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(v => { const n = Math.hypot(...v); return v.map(x => x / n); });
let F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
for (let s = 0; s < 4; s++) {
  const mid = new Map(), mp = (a, b) => { const k = a < b ? a + '_' + b : b + '_' + a; if (!mid.has(k)) { const m = V[a].map((x, i) => (x + V[b][i]) / 2), n = Math.hypot(...m); V.push(m.map(x => x / n)); mid.set(k, V.length - 1); } return mid.get(k); };
  F = F.flatMap(([a, b, c]) => { const ab = mp(a, b), bc = mp(b, c), ca = mp(c, a); return [[a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]]; });
}
// ---------- déformation : demi-axes 7,65 × 3,6 × 3,6 km, taille réduite au milieu, lobes inégaux, bruit à graine ----------
const rand = rng(1986), N = 48, grid = Float32Array.from({ length: N * N * N }, () => rand()), at = (i, j, k) => grid[(((k % N) + N) % N * N + ((j % N) + N) % N) * N + ((i % N) + N) % N];
const noise = (x, y, z) => { const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z), fx = x - i, fy = y - j, fz = z - k, s = u => u * u * (3 - 2 * u), lerp = (a, b, u) => a + (b - a) * u; return lerp(lerp(lerp(at(i, j, k), at(i + 1, j, k), s(fx)), lerp(at(i, j + 1, k), at(i + 1, j + 1, k), s(fx)), s(fy)), lerp(lerp(at(i, j, k + 1), at(i + 1, j, k + 1), s(fx)), lerp(at(i, j + 1, k + 1), at(i + 1, j + 1, k + 1), s(fx)), s(fy)), s(fz)); };
const P = V.map(([ux, uy, uz]) => {
  const x = 7.65 * ux, waist = 1 - 0.3 * Math.exp(-Math.pow(x / 2.3, 2)), lobe = 1 + 0.1 * Math.tanh(x / 4), r = 3.6 * waist * lobe;   // cou étroit, lobe du côté +x plus gros
  const bump = 1 + 0.11 * (noise(ux * 3 + 20, uy * 3 + 20, uz * 3 + 20) - 0.5) + 0.06 * (noise(ux * 7 + 5, uy * 7 + 5, uz * 7 + 5) - 0.5) + 0.03 * (noise(ux * 15 + 9, uy * 15 + 9, uz * 15 + 9) - 0.5);
  return [x * bump, r * uy * bump, r * uz * bump];
});
// ---------- écritures ----------
fs.writeFileSync(path.join(dir, 'halley.obj'), '# Noyau de la comète de Halley : forme APPROCHÉE (tools/make-halley-shape.mjs), unités : km\n' + P.map(v => 'v ' + v.map(x => x.toFixed(4)).join(' ')).join('\n') + '\n' + F.map(f => 'f ' + f.map(i => i + 1).join(' ')).join('\n') + '\n');
const ext = [0, 1, 2].map(i => +(Math.max(...P.map(v => v[i])) - Math.min(...P.map(v => v[i]))).toFixed(1));
let vol = 0; for (const [a, b, c] of F) { const A = P[a], B = P[b], C = P[c]; vol += (A[0] * (B[1] * C[2] - B[2] * C[1]) - A[1] * (B[0] * C[2] - B[2] * C[0]) + A[2] * (B[0] * C[1] - B[1] * C[0])) / 6; }
console.log('halley.obj :', P.length, 'sommets,', F.length, 'triangles ; boîte', ext.join(' × '), 'km ; volume', Math.abs(vol).toFixed(0), 'km³ (≈ 500 attendus pour 15 × 8 × 8 km)');
fs.writeFileSync(path.join(dir, 'card.png'), renderMeshCard(P, F, { yaw: 0.6, pitch: 0.35, base: [112, 104, 96] }).toBuffer('image/png'));
const jp = path.join(dir, 'halley.json'), j = JSON.parse(fs.readFileSync(jp, 'utf8'));
j.appearance = Object.assign({ kind: 'mesh', model: 'halley.obj', kmPerUnit: 1, color: '#4a4540' }, j.appearance.tail ? { tail: j.appearance.tail } : {});
j.rotation = { _note: 'ILLUSTRATIF : le noyau de Halley culbute (≈ 2,2 jours, axe mal connu) ; pôle et phase arbitraires.', poleRaDeg: 90, poleDecDeg: 45, w0Deg: 0, rateDegPerDay: +(360 / 2.2).toFixed(2) };
j.menu.view.distanceUnits = 0.006;
j.card = Object.assign({}, j.card, { nearUnits: 0.05, facts: [['Forme', 'noyau allongé en « cacahuète » (illustration approchée, pas un modèle mesuré)'], ['Dimensions', '≈ 15 × 8 × 8 km (sonde Giotto, 1986)'], ['Dernier passage', 'périhélie du 9 février 1986'], ['Prochain passage', '2061'], ['Rotation', 'culbute, ≈ 2,2 jours']].map(([label, value]) => ({ label, value })) });
fs.writeFileSync(jp, JSON.stringify(j, null, 2) + '\n');
