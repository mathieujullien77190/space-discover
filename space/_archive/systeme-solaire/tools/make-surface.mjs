// Génère js/surface-<corps>.js : la surface d'un corps d'après une carte géologique publique (shapefile), simplifiée pour un globe.
//   node tools/make-surface.mjs moon <dossier des shapefiles> [--tol 0.15] [--min 0.6]
// Corps gérés : voir SOURCES. Pour Mars : tools/make-mars-geology.mjs (API de l'USGS).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readShp, readDbf, isOuter } from './lib/shapefile.mjs';
import { pack, toJs } from './lib/simplify.mjs';

const args = process.argv.slice(2), body = args[0], dir = args[1];
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? +args[i + 1] : d; };
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const rad = Math.PI / 180;

// classes de terrain : [id, nom, couleur]. classify(attributs) -> id.
const SOURCES = {
  io: {
    name: 'SURF_IO', geographic: true, file: 'Io_GeoUnits',   // Geologic Map of Io, SIM 3168 (Williams et al., USGS 2011)
    classes: [
      ['plainsLayered', 'Plaines stratifiées (soufre jaune)', '#d8c36a'], ['plainsWhite', 'Plaines blanches et claires', '#f0ead2'], ['plainsRed', 'Plaines brun-rouge', '#a8643c'],
      ['flowsDark', 'Coulées sombres', '#6a5440'], ['flowsBright', 'Coulées claires', '#e6cf78'], ['flowsUndiv', 'Coulées', '#a8884a'],
      ['pateraDark', 'Fonds de patères (volcans) sombres', '#2c2723'], ['pateraBright', 'Fonds de patères clairs', '#cdb88a'], ['mountains', 'Montagnes et tholi', '#b8b19c'],
    ],
    classify: r => {
      const n = (r.UnitName || '').toLowerCase();
      if (/layered/.test(n)) return 'plainsLayered'; if (/white|bright plains/.test(n)) return 'plainsWhite'; if (/red-brown/.test(n)) return 'plainsRed';
      if (/flows, dark/.test(n)) return 'flowsDark'; if (/flows, bright/.test(n)) return 'flowsBright'; if (/flows/.test(n)) return 'flowsUndiv';
      if (/patera floor, bright/.test(n)) return 'pateraBright'; if (/patera/.test(n)) return 'pateraDark';
      return 'mountains';
    },
  },
  ganymede: {
    name: 'SURF_GANYMEDE', geographic: true, file: 'GeologyUnits',   // Global Geologic Map of Ganymede, SIM 3237 (Collins et al., USGS 2014)
    classes: [
      ['dark', 'Terrains sombres (anciens, cratérisés)', '#6d645b'], ['bright', 'Terrains clairs (sillonnés)', '#b9b5ae'], ['crater', 'Cratères et matériaux d’impact', '#dcd9d3'],
      ['palimpsest', 'Palimpsestes (anciens cratères effacés)', '#9a948b'], ['reticulate', 'Terrain réticulé', '#8f8a82'], ['basin', 'Bassins', '#847e75'],
    ],
    classify: r => {
      const u = r.Unit || '';
      if (/^(d|dc|dl)$/.test(u)) return 'dark'; if (/^(l|lg\d|ls\d|li\d)$/.test(u)) return 'bright'; if (/^(c1|c2|c3|cu)$/.test(u)) return 'crater';
      if (/^(p|pi)$/.test(u)) return 'palimpsest'; if (u === 'r') return 'reticulate'; if (/^b/.test(u)) return 'basin'; return 'dark';
    },
  },
  europa: {
    name: 'SURF_EUROPA', geographic: true, file: 'GeoUnits_FINAL',   // Global Geologic Map of Europa, SIM 3513 (Leonard, Patthoff et Senske, USGS 2024)
    classes: [
      ['plains', 'Plaines (striées)', '#e2dccd'], ['bands', 'Bandes', '#a99882'], ['chaos', 'Terrains chaotiques', '#9b7d66'], ['crater', 'Cratères et éjectas', '#f0f2f2'],
    ],
    classify: r => { const u = r.Geounits || ''; if (/^ch/i.test(u)) return 'chaos'; if (u === 'b') return 'bands'; if (/^ce?$/.test(u)) return 'crater'; return 'plains'; },
  },
  titan: {
    name: 'SURF_TITAN', geographic: true,   // Titan global geomorphological map (Lopes et al. 2020, Nature Astronomy ; données Mendeley, 10.17632/f6jrtyfp66) : un fichier par type de terrain
    files: { Plains_3: 'plains', Dunes: 'dunes', Mountains: 'mountains', Labyrinth: 'labyrinth', Basins: 'basins', Craters: 'craters' },
    classes: [
      ['plains', 'Plaines', '#7a6246'], ['dunes', 'Champs de dunes (sombres)', '#3b2f26'], ['mountains', 'Terrains vallonnés et montagneux', '#b08a5a'],
      ['labyrinth', 'Terrains labyrinthiques', '#c0a070'], ['basins', 'Bassins (lacs et mers d’hydrocarbures)', '#2d2a2e'], ['craters', 'Cratères', '#cdb089'],
    ],
  },
  moon: {
    name: 'SURF_MOON', R: 1737400,
    file: 'GeoUnits',   // Unified Geologic Map of the Moon 1:5M (USGS, Fortezzo, Spudis et Harrel, 2020), projection équidistante cylindrique en mètres
    classes: [
      ['mare', 'Mers (basalte sombre)', '#4b4c52'],
      ['terra', 'Hautes terres', '#aaa7a0'],
      ['plains', 'Plaines claires', '#948f8a'],
      ['basin', 'Matériaux de bassins d\'impact', '#a19e98'],
      ['craterOld', 'Cratères anciens', '#8e8b86'],
      ['craterMid', 'Cratères moyens (Ératosthénien)', '#bebbb4'],
      ['craterYoung', 'Cratères jeunes (Copernicien, rayonnés)', '#e3e0da'],
    ],
    classify: r => {
      const name = r.FIRST_Un_2 || '', age = r.FIRST_Un_1 || '';
      if (/Mare|Dark Mantling/.test(name)) return 'mare';
      if (/^Plains|Plateau/.test(name)) return 'plains';
      if (/Terra/.test(name)) return 'terra';
      if (/Crater|Cluster/.test(name)) return /Copernican/.test(age) ? 'craterYoung' : /Eratosthenian/.test(age) ? 'craterMid' : 'craterOld';
      return 'basin';
    },
  },
};

const src = SOURCES[body];
if (!src || !dir) { console.error('usage : node tools/make-surface.mjs <' + Object.keys(SOURCES).join('|') + '> <dossier des shapefiles> [--tol 0.15] [--min 0.6]'); process.exit(1); }
const TOL = opt('tol', 0.15), MIN = opt('min', 0.6);
// sources : un fichier dont les attributs donnent la classe (classify), ou un fichier par classe (files)
const inputs = src.files ? Object.entries(src.files).map(([f, cls]) => ({ shp: readShp(path.join(dir, f + '.shp')), cls: () => cls })) : (() => { const dbf = readDbf(path.join(dir, src.file + '.dbf')); return [{ shp: readShp(path.join(dir, src.file + '.shp')), cls: i => src.classify(dbf[i]) }]; })();
// orientation : la projection (comme d3) lit le sens des anneaux. Certains shapefiles ont des anneaux inversés : on impose, pour chaque polygone,
// extérieur = horaire, trou = antihoraire, selon la profondeur d'imbrication de l'anneau parmi ceux du même polygone.
const inside = (pt, ring) => { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) if ((ring[i][1] > pt[1]) !== (ring[j][1] > pt[1]) && pt[0] < (ring[j][0] - ring[i][0]) * (pt[1] - ring[i][1]) / (ring[j][1] - ring[i][1]) + ring[i][0]) c = !c; return c; };
let flipped = 0; const stats = {};
function normalize(rings) {
  const box = rings.map(r => { let a = 1e99, b = -1e99, c = 1e99, d = -1e99; for (const [x, y] of r) { if (x < a) a = x; if (x > b) b = x; if (y < c) c = y; if (y > d) d = y; } return [a, b, c, d]; });   // boîtes englobantes : évitent presque tous les tests coûteux
  return rings.map((r, i) => {
    const pt = r[Math.floor(r.length / 2)];
    let depth = 0; for (let j = 0; j < rings.length; j++) { const bx = box[j]; if (j !== i && pt[0] >= bx[0] && pt[0] <= bx[1] && pt[1] >= bx[2] && pt[1] <= bx[3] && inside(pt, rings[j])) depth++; }
    const wantOuter = depth % 2 === 0;
    if (isOuter(r) === wantOuter) return r; flipped++; return r.slice().reverse();
  });
}
const parts = []; let nIn = 0, ptsIn = 0, ptsOut = 0;
for (const { shp, cls: clsOf } of inputs) shp.forEach((s, i) => {
  const cls = src.classes.findIndex(c => c[0] === clsOf(i));
  for (const ring of normalize(s.parts)) {
    // anneaux extérieurs ET trous (orientation opposée) sont gardés : le remplissage par classe (règle non nulle) les traite ensemble
    nIn++; ptsIn += ring.length;
    const deg = src.geographic ? ring : ring.map(([x, y]) => [x / src.R / rad, y / src.R / rad]);
    const p = pack(deg, TOL, MIN, stats); if (!p) continue;
    parts.push({ a: p.a, c: cls, r: p.r }); ptsOut += p.r.length;
  }
});
const js = toJs(src.name, `// Surface (${body}) d'après une carte géologique publique, simplifiée. GÉNÉRÉ par tools/make-surface.mjs — ne pas éditer à la main.`, src.classes.map(c => [c[1], c[2]]), parts, true);
fs.writeFileSync(path.join(ROOT, 'js', `surface-${body}.js`), js);
console.error(`${body} : ${flipped} anneaux remis dans le bon sens, ${stats.crossed || 0} resimplifiés (auto-intersection), ${stats.dropped || 0} écartés ; morceaux ${nIn} -> ${parts.length}, points ${ptsIn} -> ${ptsOut}, fichier ${(js.length / 1024).toFixed(0)} Ko`);
src.classes.forEach((c, i) => console.error(c[0].padEnd(12), String(parts.filter(p => p.c === i).length).padStart(5)));
