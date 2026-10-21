// Serveur de tuiles LOCAL (dev) : sert les tuiles du dossier tiles/ ; si une tuile manque, la télécharge chez Esri / AWS, la range dans tiles/ puis la sert.
// tiles/imagery/<z>/<y>/<x>.jpg (Esri World Imagery) et tiles/dem/<z>/<x>/<y>.png (AWS Terrarium). Lancé par `npm run dev` (tools/dev.mjs), port 5180.
import http from 'node:http';
import { mkdir, readdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'tiles');
const PORT = Number(process.env.TILES_PORT) || 5180;
const KINDS = {
  imagery: { ext: 'jpg', type: 'image/jpeg', url: (z, a, b) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${a}/${b}` },
  dem: { ext: 'png', type: 'image/png', url: (z, a, b) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${a}/${b}.png` },
};
const MAX_BYTES = (Number(process.env.TILES_MAX_MB) || 1024) * 1024 * 1024;   // plafond du dossier : 1 Go (les tuiles les plus anciennes sont supprimées au-delà)
let used = 0; const files = new Map();   // chemin -> { size, time }

async function scan(dir) {
  for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) await scan(f); else { const st = await stat(f); files.set(f, { size: st.size, time: st.mtimeMs }); used += st.size; }
  }
}
async function evict() {
  if (used <= MAX_BYTES * 0.95) return;
  for (const [f, v] of [...files].sort((a, b) => a[1].time - b[1].time)) {
    if (used <= MAX_BYTES * 0.9) break;
    await unlink(f).catch(() => {}); files.delete(f); used -= v.size;
  }
}
await scan(ROOT);

const pending = new Map();   // téléchargements en cours (une seule requête par tuile)

async function getTile(kind, z, a, b) {
  const k = KINDS[kind], file = path.join(ROOT, kind, z, a, `${b}.${k.ext}`);
  try { return await readFile(file); } catch { /* absente : téléchargement */ }
  if (!pending.has(file)) pending.set(file, (async () => {
    const r = await fetch(k.url(z, a, b)); if (!r.ok) throw new Error('HTTP ' + r.status);
    const buf = Buffer.from(await r.arrayBuffer()); await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, buf); files.set(file, { size: buf.length, time: Date.now() }); used += buf.length; evict(); return buf;
  })().finally(() => pending.delete(file)));
  return pending.get(file);
}

http.createServer(async (req, res) => {
  const m = /^\/(imagery|dem)\/(\d+)\/(\d+)\/(\d+)$/.exec(req.url.split('?')[0]);
  const head = { 'Access-Control-Allow-Origin': '*' };
  if (req.url.split('?')[0] === '/stats') { res.writeHead(200, { ...head, 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ bytes: used, max: MAX_BYTES, count: files.size })); }
  if (!m) { res.writeHead(404, head); return res.end(); }
  try { const buf = await getTile(m[1], m[2], m[3], m[4]); res.writeHead(200, { ...head, 'Content-Type': KINDS[m[1]].type, 'Cache-Control': 'max-age=3600' }); res.end(buf); }
  catch { res.writeHead(502, head); res.end(); }
}).listen(PORT, '0.0.0.0', () => console.log(`[tiles] http://localhost:${PORT} -> ${ROOT}`));
