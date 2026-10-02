// Orientation de la Terre : longitude du point subsolaire (éléments UAI) comparée à la valeur astronomique : −15° × (heure UTC − 12 h) − (équation du temps en minutes) / 4.
const ROOT = require('path').join(__dirname, '..', '..');
let s = require(ROOT + '/tools/load-page.js')();
const mkEl = () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {} }, append() {}, addEventListener() {}, querySelectorAll() { return []; }, setPointerCapture() {}, getContext() { return ctx; }, innerHTML: '' });
const ctx = new Proxy({}, { get: (t, k) => k === 'createRadialGradient' || k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : k in t ? t[k] : () => {}, set: (t, k, v) => { t[k] = v; return true; } });
globalThis.document = { getElementById: () => mkEl(), createElement: () => mkEl(), activeElement: null };
globalThis.innerWidth = 1200; globalThis.innerHeight = 800; globalThis.devicePixelRatio = 1; globalThis.addEventListener = () => {};
globalThis.requestAnimationFrame = () => {}; globalThis.Path2D = class { moveTo() {} lineTo() {} arc() {} closePath() {} rect() {} addPath() {} }; globalThis.performance = { now: () => 0 };
s = s.replace(/requestAnimationFrame\(loop\);\s*$/, '') + 'globalThis.T = { EARTHB, computePositions, surfaceSubLon, pos, D, focusOn, draw, fly() { flyPx = [0, 0]; }, set logR(v) { logR = v; }, set simT(v) { simT = v; } };';
new Function(s)();
const T = globalThis.T;
// dates (UTC, 12 h) et équation du temps connue (minutes) : 1er janv. 2000 ≈ −3,4 ; 21 juin 2026 ≈ −1,8 ; 3 nov. 2026 ≈ +16,4 ; 11 fév. 2026 ≈ −14,2
for (const [iso, eot] of [['2000-01-01T12:00:00Z', -3.4], ['2026-06-21T12:00:00Z', -1.8], ['2026-11-03T12:00:00Z', 16.4], ['2026-02-11T12:00:00Z', -14.2], ['2026-09-23T00:00:00Z', 7.4]]) {
  const t = T.D(iso), utc = (Date.parse(iso) % 864e5) / 36e5; T.computePositions(t);
  const lon = T.surfaceSubLon(T.EARTHB.surf, t, T.pos[T.EARTHB.idx][0], T.pos[T.EARTHB.idx][1]), want = -15 * (utc - 12) - eot / 4;
  const d = ((lon - want + 540) % 360) - 180; console.log((Math.abs(d) < 1.2 ? 'OK  ' : 'FAIL'), iso, 'point subsolaire', lon.toFixed(2) + '°', 'attendu', want.toFixed(2) + '°', '(écart', d.toFixed(2) + '°)');
}
// le globe tourné : l'axe nord-sud perpendiculaire au Soleil, côté du Soleil cohérent, à 4 dates de l'année
for (const d of [0, 91, 182, 273]) { const t = 8979 + d; T.simT = t; T.computePositions(t); T.focusOn(T.EARTHB); T.fly(); T.logR = Math.log(3e4); T.draw(1); const S = T.EARTHB.surf; console.log('jour', d, 'psi', (S.psi * 180 / Math.PI).toFixed(1) + '°', 'soleil à', S.sunRight ? 'droite' : 'gauche'); }
