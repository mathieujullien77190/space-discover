// Génère js/iss-data.js : l'élément orbital à deux lignes (TLE) le plus récent de l'ISS (CelesTrak, NORAD 25544).
//   node tools/make-iss.mjs            télécharge le TLE actuel (à refaire de temps en temps : la position de l'ISS n'est fiable qu'à ± 2 mois de l'époque du TLE)
//   node tools/make-iss.mjs --vendor   télécharge aussi le propagateur SGP4 satellite.js (MIT) dans js/vendor/satellite.min.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const txt = await (await fetch('https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE')).text();
const lines = txt.split(/\r?\n/).map(l => l.trim()).filter(Boolean), l1 = lines.find(l => l.startsWith('1 25544')), l2 = lines.find(l => l.startsWith('2 25544'));
if (!l1 || !l2) throw new Error('TLE introuvable : ' + txt.slice(0, 200));
fs.writeFileSync(path.join(ROOT, 'js', 'iss-data.js'), `// Élément orbital à deux lignes (TLE) de l'ISS, CelesTrak (NORAD 25544), récupéré le ${new Date().toISOString().slice(0, 10)}. GÉNÉRÉ par tools/make-iss.mjs — ne pas éditer à la main.\nconst ISS_TLE = [${JSON.stringify(l1)}, ${JSON.stringify(l2)}];\n`);
console.error('TLE :', l1);
if (process.argv.includes('--vendor')) {
  fs.mkdirSync(path.join(ROOT, 'js', 'vendor'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'js', 'vendor', 'satellite.min.js'), await (await fetch('https://unpkg.com/satellite.js@5.0.0/dist/satellite.min.js')).text());
  console.error('satellite.js v5.0.0 (MIT) -> js/vendor/satellite.min.js');
}
