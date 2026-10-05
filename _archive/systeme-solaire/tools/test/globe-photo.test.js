// Photos géolocalisées sur un globe : rectangle dans la texture, peinture par-dessus la carte, calque, clé de cache, chargement à la demande.
const ROOT = require('path').join(__dirname, '..', '..');
let s = require(ROOT + '/tools/load-page.js')();
const mkEl = () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {} }, append() {}, addEventListener() {}, querySelectorAll() { return []; }, setPointerCapture() {}, getContext() { return ctx; }, innerHTML: '' });
const calls = [];
const ctx = new Proxy({}, { get: (t, k) => k === 'createRadialGradient' || k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : k === 'drawImage' ? (...a) => calls.push(a) : k in t ? t[k] : () => {}, set: (t, k, v) => { t[k] = v; return true; } });
globalThis.document = { getElementById: () => mkEl(), createElement: () => mkEl(), activeElement: null };
globalThis.innerWidth = 1200; globalThis.innerHeight = 800; globalThis.devicePixelRatio = 1; globalThis.addEventListener = () => {};
globalThis.requestAnimationFrame = () => {}; globalThis.Path2D = class { moveTo() {} lineTo() {} arc() {} closePath() {} rect() {} addPath() {} }; globalThis.performance = { now: () => 0 };
s = s.replace(/requestAnimationFrame\(loop\);\s*$/, '') + 'globalThis.T = { THREE: globalThis.THREE, photoPatchGeometry, patchesOf, GLOBE_PHOTOS, photoRect, photosOf, photoKey, paintGlobeTexture, EARTHB, LAYERS, P };';
new Function(s)();
const T = globalThis.T, ok = (c, m) => console.log((c ? 'OK  ' : 'FAIL') + ' ' + m), P0 = T.GLOBE_PHOTOS[0]; T.LAYERS.photos = true;   // éteint par défaut dans l'application
ok(JSON.stringify(T.photoRect({ bounds: [-180, 180, -90, 90] }, 4096, 2048)) === '[0,0,4096,2048]', 'photo du monde entier : toute la texture');
const r = T.photoRect({ bounds: [0, 10, 40, 50] }, 3600, 1800); ok(Math.abs(r[0] - 1800) < 1e-9 && Math.abs(r[1] - 400) < 1e-9 && Math.abs(r[2] - 100) < 1e-9 && Math.abs(r[3] - 100) < 1e-9, 'zone 0–10° E, 40–50° N : x 1800, y 400, 100 × 100 px');
ok(T.photosOf(T.EARTHB).length === 0 && T.photoKey(T.EARTHB) === '', 'photo pas encore chargée : rien à peindre');
P0.img = { complete: true, naturalWidth: 2048 }; P0.state = 'ready';
ok(T.photoKey(T.EARTHB) === 'terre-nasa', 'photo chargée : clé de cache « terre-nasa »');
calls.length = 0; T.paintGlobeTexture(ctx, T.EARTHB, 4096, 2048);
ok(calls.length === 1 && calls[0][0] === P0.img && calls[0][1] === 0 && calls[0][3] === 4096 && calls[0][4] === 2048, 'peinte une fois, sur toute la texture, par-dessus la carte');
T.LAYERS.photos = false; ok(T.photoKey(T.EARTHB) === '', 'calque désactivé : plus de photo (la texture sera repeinte)');
calls.length = 0; T.paintGlobeTexture(ctx, T.P('mars'), 1024, 512); ok(calls.length === 0, 'les autres corps ne reçoivent pas la photo de la Terre');
const fs = require('fs'), f = fs.readFileSync(ROOT + '/js/lazy/photo-terre-nasa.js', 'utf8');
ok(/^\/\/ Photo/.test(f) && f.includes("[\"terre-nasa\"] = 'data:image/jpeg;base64,/9j/"), 'fichier lazy : data-URI JPEG (' + (f.length / 1024).toFixed(0) + ' Ko)');
// rustine France : géométrie three.js (vrai three.js) — chaque sommet est à la bonne longitude/latitude selon la même convention que le globe (λ = φ − 90°), et les coordonnées de texture couvrent exactement l'image
{ const FR = T.GLOBE_PHOTOS.find(p => p.id === 'france-nasa'), THREE = T.THREE; ok(!!FR && FR.patch && FR.bounds.join() === '-5.5,10,41,51.5', 'rustine France déclarée (' + FR.bounds.join(', ') + ')');
  const g = T.photoPatchGeometry(FR.bounds, 32, 24), pos = g.attributes.position, uv = g.attributes.uv, [w, e, so, n] = FR.bounds, D = Math.PI / 180; let worst = 0;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), lat = Math.asin(y) / D, phi = Math.atan2(z, -x) / D, lon = ((phi - 90 + 540) % 360) - 180;   // sommet -> lon/lat (convention du globe)
    const lonWant = w + uv.getX(i) * (e - w), latWant = so + uv.getY(i) * (n - so);
    worst = Math.max(worst, Math.abs(lat - latWant), Math.abs(((lon - lonWant + 540) % 360) - 180));
  }
  ok(worst < 1e-4, 'sommets de la rustine ↔ coordonnées de texture : écart max ' + worst.toExponential(1) + '°');
  ok(T.patchesOf(T.EARTHB).length === 0, 'rustine non chargée : rien à ajouter'); T.LAYERS.photos = true; FR.img = { complete: true, naturalWidth: 3100 }; ok(T.patchesOf(T.EARTHB).length === 1 && T.patchesOf(T.P('mars')).length === 0, 'rustine chargée : ajoutée à la Terre seulement');
  const f = require('fs').readFileSync(ROOT + '/js/lazy/photo-france-nasa.js', 'utf8'); ok(f.includes('["france-nasa"]') && f.length > 5e5, 'fichier lazy France : ' + (f.length / 1024).toFixed(0) + ' Ko');
}
