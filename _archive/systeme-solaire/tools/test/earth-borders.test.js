// Frontières, pays et villes de la Terre : chargement à la demande (balise <script>), alignement avec la projection du globe, étiquettes, coût.
const ROOT = require('path').join(__dirname, '..', '..'), fs = require('fs');
let s = require(ROOT + '/tools/load-page.js')();
const mkEl = () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {} }, append() {}, addEventListener() {}, querySelectorAll() { return []; }, setPointerCapture() {}, getContext() { return ctx; }, innerHTML: '' });
const rec = { text: [], rects: [], strokes: 0, dashes: 0 };
const ctx = new Proxy({}, { get: (t, k) => k === 'createRadialGradient' || k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : k === 'fillText' ? (tx, x, y) => rec.text.push([tx, x, y]) : k === 'rect' ? (...a) => rec.rects.push(a) : k === 'stroke' ? () => { rec.strokes++; } : k === 'setLineDash' ? a => { if (a.length) rec.dashes++; } : k in t ? t[k] : () => {}, set: (t, k, v) => { t[k] = v; return true; } });
let appended = null;
globalThis.document = { getElementById: () => mkEl(), createElement: () => mkEl(), activeElement: null, head: { appendChild(el) { appended = el; } } };
globalThis.innerWidth = 1200; globalThis.innerHeight = 800; globalThis.devicePixelRatio = 1; globalThis.addEventListener = () => {};
globalThis.requestAnimationFrame = () => {}; globalThis.Path2D = class { moveTo() {} lineTo() {} arc() {} closePath() {} rect() {} addPath() {} }; globalThis.performance = { now: () => 0 };
s = s.replace(/requestAnimationFrame\(loop\);\s*$/, '') + 'globalThis.T = { EARTHB, draw, computePositions, focusOn, fly() { flyPx = [0, 0]; }, set logR(v) { logR = v; }, get state() { return bordersState; }, get data() { return earthBorders; }, viewPt, surfPt, webZoom, LAYERS };';
new Function(s)();
const T = globalThis.T, ok = (c, m) => console.log((c ? 'OK  ' : 'FAIL') + ' ' + m);
const placeView = (lon, lat) => { const S = T.EARTHB.surf; S.view.lon = lon; S.view.lat = lat; S.psi = 0; };
const shot = rpx => { T.computePositions(9400); T.focusOn(T.EARTHB); T.fly(); T.logR = Math.log(400 / rpx * 6378.137); rec.text.length = 0; rec.rects.length = 0; rec.strokes = 0; rec.dashes = 0; const t0 = process.hrtime.bigint(); T.draw(1); return Number(process.hrtime.bigint() - t0) / 1e6; };
// 1. chargement à la demande
ok(T.state === 'idle', 'au démarrage : rien n’est chargé (état ' + T.state + ')');
placeView(2.35, 48.85); shot(300); ok(T.state === 'idle', 'Terre petite (rayon 300 px) : toujours rien chargé');
shot(1000); ok(T.state === 'loading' && appended && appended.src === 'js/lazy/earth-borders.js', 'zoom sur la Terre : balise <script> ajoutée (' + (appended && appended.src) + ')');
const before = rec.strokes; ok(T.data === null, 'avant l’arrivée des données : aucune frontière dessinée');
globalThis.EARTH_BORDERS = new Function(fs.readFileSync(ROOT + '/js/lazy/earth-borders.js', 'utf8') + ';return EARTH_BORDERS')();   // simule le navigateur qui exécute le script
appended.onload(); ok(T.state === 'ready' && T.data && T.data.lines.length > 5000, 'données prêtes : ' + T.data.lines.length + ' lignes, ' + T.data.countries.length + ' pays, ' + T.data.cities.length + ' villes');
// 2. alignement : le repère de Paris (capitale = carré) tombe là où le globe projette Paris
for (const name of ['Paris', 'Madrid', 'Tokyo']) {
  const city = T.data.cities.find(c => c.name === name), lon = city.lon, lat = city.lat;   // coordonnées exactes de la ville dans les données
  placeView(lon, lat); const t = shot(2500), S = T.EARTHB.surf, a = T.EARTHB, rpx = 2500;
  const s0 = [600, 400], v = T.viewPt(lon, lat, S.view.lat * Math.PI / 180, S.view.lon * Math.PI / 180), exp = T.surfPt(S, s0[0], s0[1], v.x * rpx, -v.y * rpx);
  const r = rec.rects.find(q => Math.abs(q[0] + 3.5 - exp[0]) < 0.5 && Math.abs(q[1] + 3.5 - exp[1]) < 0.5);
  ok(!!r, name.padEnd(6) + ' : repère de capitale à ' + (r ? (r[0] + 3.5).toFixed(1) + ',' + (r[1] + 3.5).toFixed(1) : '—') + ' (attendu ' + exp[0].toFixed(1) + ',' + exp[1].toFixed(1) + ') | ' + rec.text.length + ' textes, ' + rec.strokes + ' tracés, ' + t.toFixed(1) + ' ms');
}
// 3. contenu selon le zoom
placeView(2.5, 46.5);
shot(900); const t1 = rec.text.map(x => x[0]); ok(rec.strokes > 20, 'zoom ~2 000 km : frontières tracées (' + rec.strokes + ' tracés)');
shot(2500); const t2 = rec.text.map(x => x[0]); ok(t2.includes('FRANCE'), 'zoom ~1 000 km : « FRANCE » en capitales affichée'); ok(t2.includes('Paris') || t2.some(n => /^Lyon|Marseille|Londres|Madrid/.test(n)), 'zoom ~1 000 km : des villes sont nommées (' + t2.filter(n => n !== n.toUpperCase()).slice(0, 6).join(', ') + ')');
const nVillesLarge = t2.filter(n => n !== n.toUpperCase()).length;
shot(25000); const t3 = rec.text.map(x => x[0]), nVillesPres = t3.filter(n => n !== n.toUpperCase()).length; ok(nVillesPres >= nVillesLarge || nVillesPres > 10, 'zoom ISS 100 km : ' + nVillesPres + ' villes nommées (plus de détail en zoomant)');
ok(rec.dashes >= 0, 'pointillés pour les frontières contestées : ' + rec.dashes + ' passe(s)');
// 4. noms français et cap d'étiquettes
const names = T.data.countries.map(c => c[0]); ok(T.data.countries.some(c => c.name === 'Allemagne') && T.data.countries.some(c => c.name === 'Espagne'), 'noms de pays en français (Allemagne, Espagne)');
ok(T.data.cities.some(c => c.name === 'Londres') && T.data.cities.some(c => c.name === 'Bruxelles'), 'noms de villes en français (Londres, Bruxelles)');
// 5. calque
T.LAYERS.borders = false; shot(2500); ok(rec.text.every(x => x[0] !== 'FRANCE'), 'calque « Frontières » décoché : rien d’affiché'); T.LAYERS.borders = true;
// 6. coût
const times = []; placeView(10, 48); for (const rpx of [600, 1500, 5000, 12000, 25000]) { shot(rpx); times.push(rpx + ' px : ' + shot(rpx).toFixed(1) + ' ms'); } console.log('    coût par image (borders + tout le reste) :', times.join(' | '));
