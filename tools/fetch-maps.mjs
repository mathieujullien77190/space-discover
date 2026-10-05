// Télécharge dans tools/.cache (ignoré par git) les cartes sources de Wikimedia Commons (NASA / USGS, domaine public) utilisées par make-real-maps.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '.cache'); fs.mkdirSync(dir, { recursive: true });
export const SOURCES = {
  mercury: 'Mercury - complete mono basemap 2500mpp equirectangular.png',
  europa: 'Europa Voyager GalileoSSI global mosaic.jpg',
  ganymede: 'Ganymede Global Geologic Map and Global Image Mosaic.jpg',
  callisto: 'Callisto USGS global small.jpg',
  titan: 'Titan map April 2011 full.png',
  pluto: 'PIA20658-Pluto-Global-released20160502.jpg',
  io: 'Io map projection PIA00319.jpg',
  charon: 'Charon Basemap DEM Grid.jpg',
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (const [id, title] of Object.entries(SOURCES)) {
  const f = path.join(dir, id + path.extname(title)); if (fs.existsSync(f)) continue;
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch('https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(title.replace(/ /g, '_')), { headers: { 'User-Agent': 'space-discover-map-fetch/1.0 (https://github.com/mathieujullien77190/space-discover)' } });
    if (r.ok) { fs.writeFileSync(f, Buffer.from(await r.arrayBuffer())); console.log(id, (fs.statSync(f).size / 1e6).toFixed(1), 'Mo'); break; }
    console.log(id, 'HTTP', r.status, '— nouvel essai'); await sleep(4000 * (attempt + 1));
  }
  await sleep(1500);
}
