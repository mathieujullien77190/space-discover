const ROOT = require('path').join(__dirname, '..', '..');
let s = require(ROOT + '/tools/load-page.js')();
const mkEl = () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {} }, append() {}, addEventListener() {}, querySelectorAll() { return []; }, setPointerCapture() {}, getContext() { return ctx; }, innerHTML: '' });
let fills = 0; const ctx = new Proxy({}, { get: (t, k) => k === 'createRadialGradient' || k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : k === 'fill' ? () => { fills++; } : k in t ? t[k] : () => {}, set: (t, k, v) => { t[k] = v; return true; } });
globalThis.document = { getElementById: () => mkEl(), createElement: () => mkEl(), activeElement: null };
globalThis.innerWidth = 1200; globalThis.innerHeight = 800; globalThis.devicePixelRatio = 1; globalThis.addEventListener = () => {};
globalThis.requestAnimationFrame = () => {}; globalThis.Path2D = class { moveTo() {} lineTo() {} arc() {} closePath() {} rect() {} addPath() {} }; globalThis.performance = { now: () => 0 };
s = s.replace(/requestAnimationFrame\(loop\);\s*$/, '') + 'globalThis.T = { fly() { flyPx = [0, 0]; }, drawSurface, landCommands, SURFACES, P, focusOn, draw, computePositions, surfaceSubLon, pos, set logR(v) { logR = v; }, set simT(v) { simT = v; }, EARTHB, wrapLon };';
new Function(s)();
const T = globalThis.T, moon = T.P('terre').moons[0], mars = T.P('mars');
console.log('corps cartographiés :', T.SURFACES.map(b => b.name + ' (' + b.surf.parts.length + ' anneaux)').join(', '));

// Lune : à la pleine lune la face visible est éclairée (point subsolaire ~0°), à la nouvelle lune c'est la face cachée (~180°)
{ let best = null, worst = null; for (let t = 9400; t < 9430; t += 0.05) { T.computePositions(t); const m = T.pos[moon.idx], e = T.pos[T.EARTHB.idx]; const gm = [m[0] - e[0], m[1] - e[1]], se = [-e[0], -e[1]]; const cosEl = (gm[0] * se[0] + gm[1] * se[1]) / Math.hypot(...gm) / Math.hypot(...se); const el = Math.acos(cosEl) * 180 / Math.PI; const lon = T.surfaceSubLon(moon.surf, t, m[0], m[1]); if (!best || el > best.el) best = { el, lon }; if (!worst || el < worst.el) worst = { el, lon }; }
  console.log('Lune : pleine lune (élongation', best.el.toFixed(0) + '°) point subsolaire', best.lon.toFixed(1), '° ; nouvelle lune (élongation', worst.el.toFixed(0) + '°) point subsolaire', worst.lon.toFixed(1), '°'); }
// phase lunaire : le point subsolaire doit reculer de ~12,19°/jour
T.computePositions(9400); const f = t => { T.computePositions(t); const m = T.pos[moon.idx]; return T.surfaceSubLon(moon.surf, t, m[0], m[1]); };
console.log('Lune : dérive du point subsolaire par jour :', (T.wrapLon(f(9401) - f(9400))).toFixed(2), '° (attendu ≈ -12,19)');
// dessin et coût
for (const b of [moon, mars]) { T.focusOn(b); T.computePositions(9400); for (const R of [2e5, 6e3, 2.5e3, 1.2e3]) { fills = 0; const t0 = Date.now(); for (let i = 0; i < 20; i++) { T.simT = 9400 + i * 0.7; T.draw(1); } console.log(b.name.padEnd(6), 'zoom', String(R).padEnd(7), 'remplissages/image', (fills / 20).toFixed(0).padStart(4), '|', ((Date.now() - t0) / 20).toFixed(1), 'ms/image'); T.logR = Math.log(R); } }
for (const [b, R] of [[moon, 700], [moon, 2500], [moon, 6000], [mars, 1100], [mars, 4000]]) { T.focusOn(b); T.fly(); T.logR = Math.log(R); T.computePositions(9400); fills = 0; const t0 = Date.now(); for (let i = 0; i < 30; i++) { T.simT = 9400 + i * 0.7; T.draw(1); } console.log('RÉEL', b.name.padEnd(5), 'rayon de vue', String(R).padEnd(5), 'km | remplissages', (fills / 30).toFixed(0).padStart(4), '|', ((Date.now() - t0) / 30).toFixed(1), 'ms/image (cache reconstruit à chaque image)'); }
{ T.focusOn(mars); T.logR = Math.log(1100); T.computePositions(9400); T.draw(1);
  const S = mars.surf; let vis = 0; const lat0 = S.view.lat * Math.PI / 180, lon0 = S.view.lon * Math.PI / 180, vc = [Math.cos(lat0) * Math.cos(lon0), Math.cos(lat0) * Math.sin(lon0), Math.sin(lat0)];
  console.log('Mars view', S.view, 'psi', S.psi, 'parts', S.parts.length, 'p0', S.parts[0].rho, S.parts[0].k, 'a', S.parts[0].a);
  for (const p of S.parts) { const d = Math.acos(Math.max(-1, Math.min(1, p.k[0] * vc[0] + p.k[1] * vc[1] + p.k[2] * vc[2]))); if (d - p.rho < Math.PI / 2) vis++; }
  console.log('visibles', vis); }
{ fills = 0; T.drawSurface(mars, 600, 400, 1235); console.log('drawSurface direct Mars : remplissages', fills);
  const S = mars.surf; let n = 0; for (const p of S.parts.slice(0, 40)) { const c = T.landCommands([p.ring], 25, 0, 0, 0, 1235); n += c.length; } console.log('commandes sur 40 morceaux', n); }
// lunes de Jupiter : longitude sous Jupiter (doit rester ≈ 0°)
{ const jup = T.P('jupiter');
  for (const id of ['io', 'europe', 'ganymede']) { const m = T.P('jupiter').moons.find(x => x.id === id); let mx = 0; for (const t of [1000, 3000, 5000, 7000, 9000, 9400, 9600]) { T.computePositions(t); const a = T.pos[m.idx], j = T.pos[jup.idx]; const lon = T.surfaceSubLon(m.surf, t, a[0] - j[0], a[1] - j[1]); mx = Math.max(mx, Math.abs(lon)); }
    console.log(id.padEnd(9), 'écart max de la longitude sous Jupiter :', mx.toFixed(1), '°'); } }
