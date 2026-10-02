// Génère js/names.js : les reliefs nommés (cratères, monts, plaines, vallées…) de chaque corps, d'après la nomenclature officielle de l'UAI
// (Gazetteer of Planetary Nomenclature, USGS Astrogeology) : nom, position du centre, diamètre.
//   node tools/make-names.mjs [dossier]    dossier = contient <CORPS>/<CORPS>_nomenclature_center_pts.dbf (zips téléchargés depuis
//   https://asc-planetarynames-data.s3.us-west-2.amazonaws.com/<CORPS>_nomenclature_center_pts.zip ; sans dossier : téléchargement automatique, nécessite `unzip` ou PowerShell)
// Format : NAMES = { <id du corps>: [[nom, longitude est −180..180, latitude, diamètre km, type], …] }, du plus grand au plus petit ; type : 'c' cratère, 'f' autre relief.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readDbf } from './lib/shapefile.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = process.argv[2];
if (!dir) { console.error('usage : node tools/make-names.mjs <dossier des nomenclatures extraites>'); process.exit(1); }
// id du corps dans l'application -> nom du fichier UAI, nombre maximal de reliefs gardés (les plus grands)
const BODIES = [
  ['mercure', 'MERCURY', 300], ['venus', 'VENUS', 250], ['lune', 'MOON', 450], ['mars', 'MARS', 450], ['phobos', 'PHOBOS', 120], ['deimos', 'DEIMOS', 60],
  ['io', 'IO', 200], ['europe', 'EUROPA', 130], ['ganymede', 'GANYMEDE', 190], ['callisto', 'CALLISTO', 160],
  ['mimas', 'MIMAS', 100], ['encelade', 'ENCELADUS', 100], ['tethys', 'TETHYS', 100], ['dione', 'DIONE', 120], ['rhea', 'RHEA', 140], ['titan', 'TITAN', 100], ['japet', 'IAPETUS', 100],
  ['miranda', 'MIRANDA', 100], ['ariel', 'ARIEL', 100], ['umbriel', 'UMBRIEL', 100], ['titania', 'TITANIA', 100], ['oberon', 'OBERON', 100],
  ['triton', 'TRITON', 100], ['pluton', 'PLUTO', 100], ['charon', 'CHARON', 100],
];
const wrap = lon => ((lon + 180) % 360 + 360) % 360 - 180;
const out = {}; let total = 0;
for (const [id, file, max] of BODIES) {
  const rows = readDbf(path.join(dir, file, `${file}_nomenclature_center_pts.dbf`)).filter(r => r.clean_name && r.center_lon != null && r.center_lat != null);
  // les diamètres inconnus (0) sont gardés seulement pour les corps peu fournis
  const known = rows.filter(r => r.diameter > 0), unknown = rows.length <= 200 ? rows.filter(r => !(r.diameter > 0)) : [];
  const list = [...known.sort((a, b) => b.diameter - a.diameter), ...unknown].slice(0, max);
  out[id] = list.map(r => [r.clean_name, +wrap(r.center_lon).toFixed(1), +r.center_lat.toFixed(1), Math.round(r.diameter || 0), /^crater/i.test(r.type) ? 'c' : 'f']);
  total += out[id].length;
}
const js = `// Reliefs nommés de chaque corps : nomenclature officielle de l'UAI (Gazetteer of Planetary Nomenclature, USGS Astrogeology). GÉNÉRÉ par tools/make-names.mjs — ne pas éditer à la main.\n// NAMES[id] = [[nom, longitude est (−180..180), latitude, diamètre km (0 = inconnu), 'c' cratère | 'f' autre], …], du plus grand au plus petit.\nconst NAMES = ${JSON.stringify(out)};\n`;
fs.writeFileSync(path.join(ROOT, 'js', 'names.js'), js);
console.error(`${Object.keys(out).length} corps, ${total} reliefs, ${(js.length / 1024).toFixed(0)} Ko`);
