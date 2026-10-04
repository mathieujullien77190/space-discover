// « Pile au-dessus d'un pays » : pays trouvé à un point, pixel -> longitude/latitude (inverse de la projection), clic sur la Terre, déplacement, curseurs, fiche.
const ROOT = require('path').join(__dirname, '..', '..'), fs = require('fs');
let s = require(ROOT + '/tools/load-page.js')();
const mkEl = () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {} }, append() {}, addEventListener() {}, querySelectorAll() { return []; }, setPointerCapture() {}, getContext() { return ctx; }, innerHTML: '', textContent: '' });
const ctx = new Proxy({}, { get: (t, k) => k === 'createRadialGradient' || k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : k in t ? t[k] : () => {}, set: (t, k, v) => { t[k] = v; return true; } });
globalThis.document = { getElementById: () => mkEl(), createElement: () => mkEl(), activeElement: null };
globalThis.innerWidth = 1200; globalThis.innerHeight = 800; globalThis.devicePixelRatio = 1; globalThis.addEventListener = () => {};
globalThis.requestAnimationFrame = () => {}; globalThis.Path2D = class { moveTo() {} lineTo() {} arc() {} closePath() {} rect() {} addPath() {} }; globalThis.performance = { now: () => 0 };
s = s.replace(/requestAnimationFrame\(loop\);\s*$/, '') + '\n' + fs.readFileSync(ROOT + '/js/lazy/earth-countries.js', 'utf8') + '\nglobalThis.T = { EARTH_COUNTRIES, paintGlobeTexture, countryColorList, schematicOn, LAYERS, photoKey, countryAt, earthLonLatAt, pickEarthAt, goAbove, moveCountryView, countryPanelHtml, zoomToSlider, sliderToZoom, viewPt, surfPt, EARTHB, focusOn, draw, computePositions, showInfo, SUN, get selCountry() { return selCountry; }, set selCountry(v) { selCountry = v; }, set earthDraw(v) { earthDraw = v; }, get logTarget() { return logTarget; }, set speed(v) { speed = v; }, set playing(v) { playing = v; }, set simT(v) { simT = v; }, set ready(v) { earthCountries = EARTH_COUNTRIES; countriesState = "ready"; }, minViewR, get focus() { return focus; } };';
new Function(s)();
const T = globalThis.T, ok = (c, m) => console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); T.ready = true;
const nm = (lo, la) => { const c = T.countryAt(lo, la); return c ? c.name : null; };
for (const [lo, la, want] of [[2.35, 48.85, 'France'], [13.4, 52.5, 'Allemagne'], [-98, 39, 'États-Unis'], [27.5, -29.3, 'Lesotho'], [139.7, 35.7, 'Japon'], [-47.9, -15.8, 'Brésil'], [151.2, -33.9, 'Australie'], [37.6, 55.75, 'Russie'], [-30, 30, null], [0, 0, null]]) ok(nm(lo, la) === want, `(${lo}, ${la}) → ${nm(lo, la)} (attendu ${want})`);
const fr = T.countryAt(2.35, 48.85); ok(fr.bbox[0] < -4 && fr.bbox[1] > 8 && fr.bbox[2] < 42.5 && fr.bbox[3] > 51, 'France : boîte ' + fr.bbox.join(', '));
// pixel <-> lon/lat sur la Terre dessinée
const E = T.EARTHB, S = E.surf; S.view.lat = 23; S.view.lon = 30; S.psi = -0.6; T.earthDraw = { sx: 600, sy: 400, rpx: 300 };
let worst = 0; for (const [lo, la] of [[30, 23], [10, 40], [50, 0], [20, 60], [40, -20], [5, 10]]) {
  const v = T.viewPt(lo, la, S.view.lat * Math.PI / 180, S.view.lon * Math.PI / 180); if (v.z <= 0) continue;
  const [px, py] = T.surfPt(S, 600, 400, v.x * 300, -v.y * 300), q = T.earthLonLatAt(px, py); worst = Math.max(worst, Math.abs(q.lat - la), Math.abs(q.lon - lo));
}
ok(worst < 1e-6, 'pixel → lon/lat : inverse exact de la projection (écart ' + worst.toExponential(1) + '°)'); ok(T.earthLonLatAt(600 + 301, 400) === null, 'hors du disque : null');
// clic sur la France
T.computePositions(9400); T.simT = 9400; T.focusOn(E); T.earthDraw = { sx: 600, sy: 400, rpx: 600 }; S.view.lat = 30; S.view.lon = 0; S.psi = 0;
const v = T.viewPt(2.35, 48.85, 30 * Math.PI / 180, 0), [px, py] = T.surfPt(S, 600, 400, v.x * 600, -v.y * 600), lt0 = T.logTarget;
ok(T.pickEarthAt(px, py) === true && T.selCountry && T.selCountry.name === 'France', 'clic sur Paris : pays « ' + (T.selCountry && T.selCountry.name) + ' »');
ok(Math.abs(T.selCountry.lat - 46.5) < 3 && Math.abs(T.selCountry.lon - 2.3) < 3, 'vue placée au centre du pays : ' + T.selCountry.lat.toFixed(1) + ' N, ' + T.selCountry.lon.toFixed(1) + ' E');
ok(Math.exp(T.logTarget) > 500 && Math.exp(T.logTarget) < 2000, 'zoom cadré sur la France : rayon de vue ' + Math.round(Math.exp(T.logTarget)) + ' km');
const sc = T.selCountry; ok(sc.speed === 0, 'immobile par défaut');
T.speed = 1 / 86400; T.playing = true; const l0 = sc.lon, a0 = sc.lat; T.moveCountryView(sc, 1); ok(sc.lon === l0 && sc.lat === a0, 'vitesse 0 : le point survolé ne bouge pas');
sc.lat = 0; sc.lon = 10; sc.speed = 7.66; sc.dir = 90; T.moveCountryView(sc, 1); ok(Math.abs(sc.lon - 10 - 7.66 / 6371 * 180 / Math.PI) < 1e-6 && Math.abs(sc.lat) < 1e-9, 'vitesse 7,66 km/s vers l’est, 1 s : +' + (sc.lon - 10).toFixed(4) + '° de longitude');
sc.lat = 0; sc.lon = 10; sc.dir = 0; T.moveCountryView(sc, 1); ok(sc.lat > 0.06 && Math.abs(sc.lon - 10) < 1e-6, 'direction 0° (nord) : la latitude augmente');
T.playing = false; sc.lat = 0; T.moveCountryView(sc, 1); ok(sc.lat === 0, 'en pause : pas de déplacement');
// curseur de zoom
let rt = 0; for (const r of [150, 400, 1500, 6000, 2e4]) rt = Math.max(rt, Math.abs(T.sliderToZoom(T.zoomToSlider(r)) / r - 1)); ok(rt < 0.01 && T.zoomToSlider(150) === 1000 && T.zoomToSlider(2e4) === 0, 'curseur de zoom : droite = zoom avant, aller-retour à ' + (rt * 100).toFixed(2) + ' % près');
ok(T.minViewR(E) === 150, 'zoom minimal de la Terre : 150 km');
ok(T.countryPanelHtml().includes('Au-dessus de : France') && T.countryPanelHtml().includes('aSpeed') && T.countryPanelHtml().includes('aZoom'), 'fiche : zoom, vitesse, direction');
let err = null; try { T.playing = true; for (let i = 0; i < 4; i++) T.draw(i); T.showInfo(); } catch (e) { err = e; } ok(!err, 'draw() et fiche sans exception' + (err ? ' : ' + err.stack : ''));
T.focusOn(T.SUN, 'overview'); ok(T.selCountry === null, 'Échap : quitte la vue au-dessus du pays');
T.focusOn(E); T.earthDraw = { sx: 600, sy: 400, rpx: 600 }; ok(T.pickEarthAt(600 + 700, 400) === false, 'clic hors du globe : non géré');
const sea = T.viewPt(-30, 30, 30 * Math.PI / 180, 0); S.view.lon = 0; const [qx, qy] = T.surfPt(S, 600, 400, sea.x * 600, -sea.y * 600); T.pickEarthAt(qx, qy); ok(T.selCountry && T.selCountry.name === null && Math.abs(T.selCountry.lon + 30) < 0.5, 'clic en mer : centré sur le point cliqué (' + T.selCountry.lon.toFixed(1) + ', ' + T.selCountry.lat.toFixed(1) + ')');

// fond schématique : pays colorés peints dans la texture de la Terre
{ T.LAYERS.countryFill = true; ok(T.schematicOn(E) && T.photoKey(E).includes('+pays'), 'fond schématique actif quand les contours des pays sont chargés (clé de cache « +pays »)');
  const cols = T.countryColorList(), cc = n => cols[T.EARTH_COUNTRIES.names.indexOf(n)];
  const styles = []; const g = new Proxy({}, { get: (t, k) => k in t ? t[k] : () => {}, set: (t, k, v) => { if (k === 'fillStyle') styles.push(v); t[k] = v; return true; } });
  T.paintGlobeTexture(g, E, 1024, 512); const used = new Set(styles);
  ok(!styles.includes('#5a9a4b') && styles.includes('#eef3f7') && styles.includes('#3a6cb0'), 'terres vertes remplacées par les pays ; glaciers et lacs conservés');
  ok([...used].filter(c => /^#/.test(c)).length >= 8, 'au moins 8 couleurs de pays utilisées (' + used.size + ' styles différents)');
  const pairs = [['France', 'Allemagne'], ['France', 'Espagne'], ['Allemagne', 'Pologne'], ['République populaire de Chine', 'Inde'], ['Brésil', 'Argentine'], ['Canada', 'États-Unis'], ['Russie', 'République populaire de Chine'], ['Égypte', 'Libye']];
  ok(pairs.every(([a, b]) => cc(a) && cc(b) && cc(a) !== cc(b)), 'pays voisins de couleurs différentes : ' + pairs.map(([a, b]) => a + '/' + b + ' ' + (cc(a) !== cc(b) ? '✓' : '✗')).join(' '));
  T.LAYERS.countryFill = false; ok(!T.schematicOn(E) && !T.photoKey(E).includes('pays'), 'calque désactivé : retour au vert uniforme'); T.LAYERS.countryFill = true; }
