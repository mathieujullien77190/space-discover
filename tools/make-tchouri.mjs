// Fabrique l'objet « Tchouri » (67P/Tchourioumov-Guérassimenko) : public/objects/tchouri/tchouri.json + card.png (illustration dessinée d'après le VRAI maillage).
// Modèle 3D : tchouri.obj = modèle de forme de la comète 67P, ESA/Rosetta/MPS for OSIRIS Team MPS/UPD/LAM/IAA/SSO/INTA/UPM/DASP/IDA, licence CC BY-SA 3.0 IGO
//   (https://sci.esa.int/web/rosetta/-/54728-shape-model-of-comet-67p ; téléchargé le 2026-10-05, voir public/objects/tchouri/CREDITS.md).
// Échelle du fichier : calée sur le volume de la comète (18,7 km³, de mémoire) : kmPerUnit = ∛(18,7 / volume du maillage).
// Éléments orbitaux et rotation de MÉMOIRE (à vérifier). Usage : node tools/make-tchouri.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderMeshCard } from './lib-body-art.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), dir = path.join(root, 'public', 'objects', 'tchouri'), AU = 149597870.7;
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

// ---------- illustration : rendu logiciel du maillage (tools/lib-body-art.mjs) ----------
const c = renderMeshCard(V, F, { base: [150, 140, 128] });
fs.writeFileSync(path.join(dir, 'card.png'), c.toBuffer('image/png'));
fs.writeFileSync(path.join(dir, 'CREDITS.md'), "# Tchouri — crédits\n\n`tchouri.obj` : modèle de forme de la comète 67P/Tchourioumov-Guérassimenko.\n\n- Crédit : **ESA/Rosetta/MPS for OSIRIS Team MPS/UPD/LAM/IAA/SSO/INTA/UPM/DASP/IDA**\n- Licence : **Creative Commons Attribution-ShareAlike 3.0 IGO (CC BY-SA 3.0 IGO)** : réutilisation libre avec mention du crédit, les dérivés du modèle restent sous la même licence.\n- Source : https://sci.esa.int/web/rosetta/-/54728-shape-model-of-comet-67p (téléchargé le 2026-10-05)\n- Échelle (`kmPerUnit` dans `tchouri.json`) calée sur le volume de la comète (18,7 km³) ; l'illustration `card.png` est un rendu de ce modèle (tools/make-tchouri.mjs).\n");
console.log('tchouri.json, card.png, CREDITS.md écrits');
