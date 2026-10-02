// Génère js/lazy/photo-<id>.js : une image (JPEG/PNG) en data-URI, à plaquer sur un globe 3D à des coordonnées géographiques.
//   node tools/make-photo.mjs <fichier.jpg> <id>
// Pourquoi une data-URI : en file://, une image « normale » est considérée d'une autre origine et WebGL refuse de s'en servir comme texture ; une data-URI est de même origine.
// L'image est chargée à la demande par js/globe-gl.js (balise <script>), comme les frontières. Les limites géographiques sont déclarées dans GLOBE_PHOTOS (js/globe-gl.js).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const [file, id] = process.argv.slice(2);
if (!file || !id) { console.error('usage : node tools/make-photo.mjs <fichier.jpg> <id>'); process.exit(1); }
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), buf = fs.readFileSync(file), ext = path.extname(file).toLowerCase();
const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
const js = `// Photo « ${id} » en data-URI — GÉNÉRÉ par tools/make-photo.mjs, ne pas éditer. Chargé à la demande par js/globe-gl.js.\n(globalThis.GLOBE_PHOTO_DATA = globalThis.GLOBE_PHOTO_DATA || {})[${JSON.stringify(id)}] = 'data:${mime};base64,${buf.toString('base64')}';\n`;
fs.mkdirSync(path.join(ROOT, 'js', 'lazy'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'js', 'lazy', 'photo-' + id + '.js'), js);
console.error(`photo ${id} : ${(buf.length / 1024).toFixed(0)} Ko -> ${(js.length / 1024).toFixed(0)} Ko`);
