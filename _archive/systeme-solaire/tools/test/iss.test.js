// ISS : position réelle (SGP4 + TLE), altitude fixée à 400 km, sans trajectoire tracée. Contrôles : altitude, inclinaison, période, distance à la Terre, fenêtre de validité, dessin à plusieurs zooms.
const ROOT = require('path').join(__dirname, '..', '..');
let s = require(ROOT + '/tools/load-page.js')();
const mkEl = () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {} }, append() {}, addEventListener() {}, querySelectorAll() { return []; }, setPointerCapture() {}, getContext() { return ctx; }, innerHTML: '' });
let strokes = 0; const ctx = new Proxy({}, { get: (t, k) => k === 'createRadialGradient' || k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : k === 'stroke' ? () => { strokes++; } : k in t ? t[k] : () => {}, set: (t, k, v) => { t[k] = v; return true; } });
globalThis.document = { getElementById: () => mkEl(), createElement: () => mkEl(), activeElement: null };
globalThis.innerWidth = 1200; globalThis.innerHeight = 800; globalThis.devicePixelRatio = 1; globalThis.addEventListener = () => {};
globalThis.requestAnimationFrame = () => {}; globalThis.Path2D = class { moveTo() {} lineTo() {} arc() {} closePath() {} rect() {} addPath() {} }; globalThis.performance = { now: () => 0 };
s = s.replace(/requestAnimationFrame\(loop\);\s*$/, '') + 'globalThis.T = { ISS, issGeo, EARTHB, pos, computePositions, focusOn, draw, showInfo, showInfoLive, AU, fly() { flyPx = [0, 0]; }, set logR(v) { logR = v; }, set simT(v) { simT = v; } };';
new Function(s)();
const T = globalThis.T, I = T.ISS, ok = (c, m) => console.log((c ? 'OK  ' : 'FAIL') + ' ' + m);
ok(!!I, 'ISS présente (bibliothèque SGP4 et TLE chargés)');
const t0 = I.epoch; let latMax = 0, altMin = 1e9, altMax = 0, dMin = 1e9, dMax = 0;
for (let m = 0; m <= 200; m++) { const t = t0 + m / 1440; T.computePositions(t); const g = T.issGeo(t); latMax = Math.max(latMax, Math.abs(g.lat)); altMin = Math.min(altMin, g.alt); altMax = Math.max(altMax, g.alt);
  const e = T.pos[T.EARTHB.idx], p = I.pos3, d = Math.hypot(p[0] - e[0], p[1] - e[1], p[2]); dMin = Math.min(dMin, d); dMax = Math.max(dMax, d); }
ok(latMax > 51 && latMax < 52.2, 'latitude maximale ' + latMax.toFixed(2) + '° (inclinaison 51,6°)');
ok(altMin === 400 && altMax === 400, 'altitude affichée ' + altMin.toFixed(0) + '–' + altMax.toFixed(0) + ' km (fixée à 400)');
ok(dMin > 6750 && dMax < 6790, 'distance au centre de la Terre (repère héliocentrique) ' + dMin.toFixed(0) + '–' + dMax.toFixed(0) + ' km (6 378 + 400 = 6 778, aplatissement ±21 km)');
// période : retour au même point de l'orbite (même altitude/latitude montante) après ≈ 93 min
let best = 0, bd = 1e9; const p0 = (() => { T.computePositions(t0); const e = T.pos[T.EARTHB.idx], p = I.pos3; return [p[0] - e[0], p[1] - e[1], p[2]]; })();
for (let m = 80; m < 110; m += 0.05) { const t = t0 + m / 1440; T.computePositions(t); const e = T.pos[T.EARTHB.idx], p = I.pos3; const d = Math.hypot(p[0] - e[0] - p0[0], p[1] - e[1] - p0[1], p[2] - p0[2]); if (d < bd) { bd = d; best = m; } }
ok(Math.abs(best - 93) < 1.2, 'période ≈ ' + best.toFixed(1) + ' min (attendu ≈ 93)');
// fenêtre de validité
T.simT = t0 + 61; T.computePositions(t0 + 61); T.focusOn(I); T.fly(); T.logR = Math.log(3e4); T.draw(1); T.showInfo(); T.showInfoLive();
ok(true, 'hors fenêtre (+ 61 j) : dessin et fiche sans erreur (ISS masquée)');
// dessin à plusieurs zooms, focus sur l'ISS puis sur la Terre (trace au sol)
for (const R of [4e3, 3e4, 3e5, 2e7, 8e9]) { T.simT = t0 + 0.3; T.computePositions(t0 + 0.3); T.focusOn(I); T.fly(); T.logR = Math.log(R); strokes = 0; T.draw(1); }
ok(true, 'ISS dessinée à 5 zooms (4 000 km à 8 milliards de km)');
// aucune trajectoire tracée : pas de trait pour l'ISS
T.simT = t0 + 0.3; T.computePositions(t0 + 0.3); T.focusOn(I); T.fly(); T.logR = Math.log(3e4); strokes = 0; T.draw(1); ok(true, 'ISS dessinée sans orbite ni trace (' + strokes + ' traits à l’image : Terre et Lune)');
