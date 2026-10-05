const ROOT = require('path').join(__dirname, '..', '..');
let s = require(ROOT + '/tools/load-page.js')();
const mkEl = () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {} }, append() {}, addEventListener() {}, querySelectorAll() { return []; }, setPointerCapture() {}, getContext() { return ctx; }, innerHTML: '' });
let fills = 0, ell = 0; const ctx = new Proxy({}, { get: (t, k) => k === 'createRadialGradient' || k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : k === 'fill' ? () => { fills++; } : k === 'ellipse' ? () => { ell++; } : k in t ? t[k] : () => {}, set: (t, k, v) => { t[k] = v; return true; } });
globalThis.document = { getElementById: () => mkEl(), createElement: () => mkEl(), activeElement: null };
globalThis.innerWidth = 1200; globalThis.innerHeight = 800; globalThis.devicePixelRatio = 1; globalThis.addEventListener = () => {};
globalThis.requestAnimationFrame = () => {}; globalThis.Path2D = class { moveTo() {} lineTo() {} arc() {} closePath() {} rect() {} addPath() {} }; globalThis.performance = { now: () => 0 };
s = s.replace(/requestAnimationFrame\(loop\);\s*$/, '') + 'globalThis.T = { SURFACES, focusOn, draw, computePositions, surfaceSubLon, pos, lblBoxes, showInfo, set logR(v) { logR = v; }, set simT(v) { simT = v; }, fly() { flyPx = [0, 0]; } };';
new Function(s)();
const T = globalThis.T; T.computePositions(9400);
console.log('corps'.padEnd(10), 'carte', 'noms', '| rayon de vue = 0,5 R : cercles de cratères, étiquettes, ms/image');
let worst = 0;
for (const b of T.SURFACES) { T.focusOn(b); T.fly(); T.logR = Math.log(b.R * 0.5); T.computePositions(9400); ell = 0; fills = 0; T.lblBoxes.length = 0; const t0 = Date.now(); let lab = 0;
  for (let i = 0; i < 10; i++) { T.simT = 9400 + i * 0.37; T.draw(1); lab = Math.max(lab, T.lblBoxes.length); } const ms = (Date.now() - t0) / 10; worst = Math.max(worst, ms);
  T.showInfo();
  console.log(b.name.padEnd(10), b.surf.geo ? 'oui  ' : 'non  ', String(b.surf.names.length).padStart(4), '|', String(Math.round(ell / 10)).padStart(4), 'cercles', String(lab).padStart(3), 'étiquettes', ms.toFixed(1).padStart(5), 'ms'); }
console.log('pire cas', worst.toFixed(1), 'ms/image');
