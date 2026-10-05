// Fabrique public/objects/mars/mars.jpg : carte de Mars « dessinée » (aplats de couleur, comme la carte de la Lune), sans noms.
// Source : mosaïque couleur Viking MDIM 2.1 (NASA / JPL / USGS, domaine public) https://commons.wikimedia.org/wiki/File:Mars_Viking_MDIM21_ClrMosaic_1km.jpg
// Usage : node tools/make-mars-map.js <mosaïque.jpg> ; la luminance est lissée puis classée en 4 teintes (terrains sombres → clairs) + les calottes glaciaires.
const sharp = require('sharp'), path = require('path');
sharp.cache(false);
const W = 4096, H = 2048, src = process.argv[2];
if (!src) { console.log('usage : node tools/make-mars-map.js <mosaique.jpg>'); process.exit(1); }
const PALETTE = [[104, 52, 36], [150, 80, 50], [190, 112, 66], [222, 156, 98]], ICE = [244, 238, 230];   // du plus sombre (basaltes) au plus clair (poussière) ; glace
(async () => {
  const img = sharp(src, { limitInputPixels: false }).resize(W, H, { fit: 'fill' });
  const rgb = await img.clone().removeAlpha().raw().toBuffer();
  const blurred = await img.clone().blur(14).removeAlpha().raw().toBuffer();   // lissage : contours arrondis, pas de grain
  const L = new Float32Array(W * H), ice = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const r = blurred[3 * i], g = blurred[3 * i + 1], b = blurred[3 * i + 2], lum = 0.3 * r + 0.59 * g + 0.11 * b, sat = Math.max(r, g, b) - Math.min(r, g, b);
    L[i] = lum; ice[i] = lum > 170 && sat < 60 ? 1 : 0;   // calottes : très claires et peu colorées
  }
  // seuils = quantiles de la luminance (hors glace et hors bandes polaires hors carte)
  const vals = []; for (let i = 0; i < W * H; i += 7) if (!ice[i]) vals.push(L[i]); vals.sort((a, b) => a - b);
  const q = p => vals[Math.floor(p * (vals.length - 1))], T = [q(0.22), q(0.52), q(0.80)];
  const out = Buffer.alloc(W * H * 3);
  for (let i = 0; i < W * H; i++) { const c = ice[i] ? ICE : PALETTE[L[i] < T[0] ? 0 : L[i] < T[1] ? 1 : L[i] < T[2] ? 2 : 3]; out[3 * i] = c[0]; out[3 * i + 1] = c[1]; out[3 * i + 2] = c[2]; }
  await sharp(out, { raw: { width: W, height: H, channels: 3 } }).blur(0.8).jpeg({ quality: 88, mozjpeg: true }).toFile(path.join(__dirname, '..', 'public', 'objects', 'mars', 'mars.jpg'));
  console.log('seuils', T.map(v => v.toFixed(0)).join(' / '), '→ public/objects/mars/mars.jpg');
})().catch(e => { console.error(e); process.exit(1); });
