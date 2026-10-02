// Génère js/mars-data.js : la carte géologique globale de Mars (USGS Astrogeology, SIM 3292 — Tanaka et al. 2014, domaine public)
// simplifiée pour être dessinée sur un globe : les 44 unités sont regroupées en 8 classes de terrain colorées, contours simplifiés (Douglas-Peucker).
//   node tools/make-mars-geology.mjs            télécharge les unités depuis l'API de l'USGS (≈ 650 Mo de JSON, plusieurs minutes)
//   node tools/make-mars-geology.mjs --cache d  relit des pages déjà téléchargées (units-<offset>.json dans le dossier d)
// Options : --tol 0.3 (tolérance de simplification en degrés) --min 0.6 (aire minimale d'un morceau, en deg²)
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const CACHE = opt('cache', null), TOL = +opt('tol', 0.3), MIN_AREA = +opt('min', 0.6);
const API = 'https://astrogeology.usgs.gov/pygeoapi/collections/mars/sim3292_global_geologic_map/units/items?f=json&limit=200&offset=';
const OUT = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', 'js', 'mars-data.js');

// classes de terrain : [id, nom, couleur, test sur le code de l'unité]
const CLASSES = [
  ['highland', 'Hautes terres anciennes (Noachien)', '#9c5a3a', u => /^(e|m|l)?N(h|hm|hu|he)$/.test(u) || u === 'HNhu' || u === 'eHh'],
  ['plain', 'Plaines basses', '#cf8f5e', u => u === 'lHl' || u === 'mAl'],
  ['volcanic', 'Terrains volcaniques', '#7d4d3c', u => /v/.test(u)],
  ['basin', 'Bassins et plaines claires', '#dca472', u => /b$/.test(u)],
  ['transition', 'Transition, écoulements, tabliers', '#bd7c4e', u => /^(e|m|l)?(H|AH|HN)(t|tu|to)$/.test(u) || /^(Aa|lAa|ANa)$/.test(u) || u === 'Hto'],
  ['impact', 'Terrains d\'impact', '#b06b45', u => u === 'AHi'],
  ['polar', 'Régions polaires', '#ece3da', u => /^(Apu|Hp|lApc|Hpe|Ap|Hpu)$/.test(u)],
  ['dunes', 'Dunes polaires sombres', '#5b4a45', u => u === 'lApd'],
];
const classOf = u => { const c = CLASSES.find(c => c[3](u)); return c ? c[0] : 'transition'; };

// Douglas-Peucker sur des coordonnées corrigées de la latitude (le degré de longitude rétrécit vers les pôles)
const P2 = p => [p[0] * Math.cos(p[1] * Math.PI / 180), p[1]];
function dp(pts, tol) {
  if (pts.length < 3) return pts;
  const q = pts.map(P2), keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(); let dmax = 0, im = -1;
    const [ax, ay] = q[a], [bx, by] = q[b], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1e-12;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((q[i][0] - ax) * dy - (q[i][1] - ay) * dx) / L; if (d > dmax) { dmax = d; im = i; } }
    if (dmax > tol && im > 0) { keep[im] = 1; stack.push([a, im], [im, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
const area = pts => { const q = pts.map(P2); let s = 0; for (let i = 0; i < q.length; i++) { const j = (i + 1) % q.length; s += q[i][0] * q[j][1] - q[j][0] * q[i][1]; } return Math.abs(s) / 2; };

const parts = [];   // tous les morceaux, toutes classes confondues
let nIn = 0, nOut = 0, ptsIn = 0, ptsOut = 0;
function eat(features) {
  for (const f of features) {
    const cls = classOf(f.properties.unit), polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const poly of polys) {
      let ring = poly[0]; nIn++; ptsIn += ring.length;
      if (ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]) ring = ring.slice(0, -1);   // anneau fermé : on retire le doublon
      const a0 = area(ring); if (a0 < MIN_AREA) continue;
      const s = dp(ring, TOL).map(p => [Math.round(p[0] * 10), Math.round(p[1] * 10)]);
      const clean = s.filter((p, i) => i === 0 || p[0] !== s[i - 1][0] || p[1] !== s[i - 1][1]);
      if (clean.length < 4) continue;
      parts.push({ a: a0, c: CLASSES.findIndex(c => c[0] === cls), r: clean }); nOut++; ptsOut += clean.length;
    }
  }
}
if (CACHE) {
  for (const f of fs.readdirSync(CACHE).filter(f => /^units-\d+\.json$/.test(f)).sort((a, b) => parseInt(a.slice(6)) - parseInt(b.slice(6)))) { console.error('lit', f); eat(JSON.parse(fs.readFileSync(path.join(CACHE, f), 'utf8')).features); }
} else {
  for (let off = 0; ; off += 200) { console.error('télécharge offset', off); const j = await (await fetch(API + off)).json(); if (!j.features.length) break; eat(j.features); }
}
// tri GLOBAL par taille décroissante : les grands morceaux d'abord, les petits par-dessus
// (les trous des grands polygones ne sont pas gérés : ils sont comblés par les unités plus petites)
parts.sort((p, q) => q.a - p.a);
const js = `// Carte géologique de Mars, simplifiée. GÉNÉRÉ par tools/make-mars-geology.mjs — ne pas éditer à la main.
// Source : USGS Astrogeology, Mars Global Geologic Map SIM 3292 (Tanaka et al. 2014), domaine public.
// classes : [nom, couleur] ; parts : [indice de classe, [lon0, lat0, lon1, lat1, …] en dixièmes de degré (lon est)], du plus grand au plus petit.
const MARS_GEO = { classes: ${JSON.stringify(CLASSES.map(c => [c[1], c[2]]))}, parts: ${JSON.stringify(parts.map(p => [p.c, p.r.flat()]))} };
`;
fs.writeFileSync(OUT, js);
console.error(`morceaux ${nIn} -> ${nOut}, points ${ptsIn} -> ${ptsOut}, fichier ${(js.length / 1024).toFixed(0)} Ko`);
CLASSES.forEach((c, i) => console.error(c[0].padEnd(11), String(parts.filter(p => p.c === i).length).padStart(5), 'morceaux'));
