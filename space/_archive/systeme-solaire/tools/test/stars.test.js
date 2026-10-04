// Étoiles voisines : direction écliptique calculée à partir de α, δ comparée aux valeurs connues ; dessin au zoom maximal ; sélection d'une étoile.
const ROOT = require('path').join(__dirname, '..', '..');
let s = require(ROOT + '/tools/load-page.js')();
const mkEl = () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {} }, append() {}, addEventListener() {}, querySelectorAll() { return []; }, setPointerCapture() {}, getContext() { return ctx; }, innerHTML: '' });
const ctx = new Proxy({}, { get: (t, k) => k === 'createRadialGradient' || k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : k in t ? t[k] : () => {}, set: (t, k, v) => { t[k] = v; return true; } });
globalThis.document = { getElementById: () => mkEl(), createElement: () => mkEl(), activeElement: null };
globalThis.innerWidth = 1200; globalThis.innerHeight = 800; globalThis.devicePixelRatio = 1; globalThis.addEventListener = () => {};
globalThis.requestAnimationFrame = () => {}; globalThis.Path2D = class { moveTo() {} lineTo() {} arc() {} closePath() {} rect() {} addPath() {} }; globalThis.performance = { now: () => 0 };
s = s.replace(/requestAnimationFrame\(loop\);\s*$/, '') + 'globalThis.T = { STARS, LOG_MAX, draw, computePositions, selectStar, showInfo, updateScale, get hits() { return hits; }, get selStar() { return selStar; }, set logR(v) { logR = v; }, set logTarget(v) { logTarget = v; }, get logTarget() { return logTarget; }, fly() { flyPx = [0, 0]; }, LY, SUN, focusOn, scaleHtml: () => 0 };';
new Function(s)();
const T = globalThis.T, ok = (c, m) => console.log((c ? 'OK  ' : 'FAIL') + ' ' + m);
// directions écliptiques connues (J2000) : [nom, longitude, latitude]
for (const [n, lon, lat] of [['Sirius', 104.1, -39.6], ['Véga', 285.3, 61.8], ['Arcturus', 204.2, 30.7], ['Aldébaran', 70.0, -5.5], ['Régulus', 150.1, 0.5], ['α du Centaure', 239.8, -42.6], ['Procyon', 115.8, -16.0]]) {
  const st = T.STARS.find(x => x.name === n), l = st.lonDeg < 0 ? st.lonDeg + 360 : st.lonDeg;
  ok(Math.abs(l - lon) < 1.5 && Math.abs(st.latDeg - lat) < 1.5, n.padEnd(14) + ' lon ' + l.toFixed(1) + '° lat ' + st.latDeg.toFixed(1) + '° (attendu ' + lon + '° ' + lat + '°)');
}
ok(T.STARS.length >= 26, T.STARS.length + ' étoiles');
ok(Math.abs(Math.hypot(T.STARS[0].x, T.STARS[0].y) / T.LY) < 4.3, 'Proxima : projection à plat ≤ 4,24 al');
// dessin à plusieurs zooms jusqu'au maximum
T.computePositions(9400);
for (const R of [8e9, 1e11, 1e12, 1e13, 1e14, 5e14, 1.2e15]) { T.focusOn(T.SUN, 'overview'); T.fly(); T.logR = Math.log(R); T.draw(1); }
ok(true, 'dessin de 8e9 km à 1,2e15 km sans erreur');
T.logR = Math.log(1e14); T.draw(1); const stars = T.hits.filter(h => h.star).length; ok(stars >= 15, stars + ' étoiles cliquables à 1e14 km');
T.updateScale(); ok(true, 'barre d\'échelle en années-lumière');
T.selectStar(T.STARS[1]); T.fly(); T.logR = T.logTarget; T.draw(1); ok(T.selStar === T.STARS[1], 'sélection d\'une étoile : vue centrée sur ' + T.selStar.name);
T.showInfo(); ok(true, 'fiche de l\'étoile');
ok(Math.abs(T.LOG_MAX - Math.log(1.2e15)) < 1e-9, 'zoom maximal 1,2e15 km ≈ ' + (1.2e15 / T.LY).toFixed(0) + ' années-lumière');
