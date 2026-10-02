const ROOT = require('path').join(__dirname, '..', '..');
// Audit : pour chaque jeu de données, chaque anneau est projeté seul (comme la page le fait) sur 12 vues ; on compte les anneaux dont le remplissage ne correspond pas à la vérité planaire.
const fs = require('fs');
let src = require(ROOT + '/tools/load-page.js')();
const mkEl = () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {} }, append() {}, addEventListener() {}, querySelectorAll() { return []; }, setPointerCapture() {}, getContext() { return ctx; }, innerHTML: '' });
const ctx = new Proxy({}, { get: (t, k) => k === 'createRadialGradient' || k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : k in t ? t[k] : () => {}, set: (t, k, v) => { t[k] = v; return true; } });
globalThis.document = { getElementById: () => mkEl(), createElement: () => mkEl(), activeElement: null };
globalThis.innerWidth = 1200; globalThis.innerHeight = 800; globalThis.devicePixelRatio = 1; globalThis.addEventListener = () => {};
globalThis.requestAnimationFrame = () => {}; globalThis.Path2D = class { moveTo() {} lineTo() {} arc() {} closePath() {} rect() {} addPath() {} }; globalThis.performance = { now: () => 0 };
new Function(src.replace(/requestAnimationFrame\(loop\);\s*$/, '') + 'globalThis.LC = landCommands; globalThis.SURFACES = SURFACES;')();
const LC = globalThis.LC, D = Math.PI / 180, R = 100;
function polylines(cmds) { const subs = []; let cur = null; for (const c of cmds) { if (c[0] === 'M') { cur = [[c[1], c[2]]]; subs.push(cur); } else if (c[0] === 'L') cur.push([c[1], c[2]]); else if (c[0] === 'A') { const [, x, y, acw, , a0, a1] = c, T = Math.PI * 2; const d = acw ? -(((a0 - a1) % T + T) % T) : ((a1 - a0) % T + T) % T; for (let i = 1; i <= 24; i++) { const a = a0 + d * i / 24; cur.push([Math.cos(a) * R, Math.sin(a) * R]); } cur.push([x, y]); } } return subs; }
function winding(px, py, subs) { let w = 0; for (const s of subs) for (let i = 0; i < s.length; i++) { const a = s[i], b = s[(i + 1) % s.length]; if (a[1] <= py) { if (b[1] > py && (b[0] - a[0]) * (py - a[1]) - (px - a[0]) * (b[1] - a[1]) > 0) w++; } else if (b[1] <= py && (b[0] - a[0]) * (py - a[1]) - (px - a[0]) * (b[1] - a[1]) < 0) w--; } return w; }
// vérité planaire par la règle non nulle (comme le remplissage) : exacte aussi pour un grand anneau qui se frôle lui-même
const inRing = (x, y, p) => { let w = 0; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const a = p[j], b = p[i]; if (a[1] <= y) { if (b[1] > y && (b[0] - a[0]) * (y - a[1]) - (x - a[0]) * (b[1] - a[1]) > 0) w++; } else if (b[1] <= y && (b[0] - a[0]) * (y - a[1]) - (x - a[0]) * (b[1] - a[1]) < 0) w--; } return w !== 0; };
const inRingParity = (x, y, p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i][1] > y) !== (p[j][1] > y) && x < (p[j][0] - p[i][0]) * (y - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]) c = !c; return c; };
const pts = []; let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
for (let n = 0; n < 90; n++) { const x = (rnd() * 2 - 1) * R, y = (rnd() * 2 - 1) * R; if (x * x + y * y < R * R * 0.98) pts.push([x, y]); }
const views = []; for (const lat0 of [25, -50, 70]) for (let lon0 = -180; lon0 < 180; lon0 += 90) views.push([lat0, lon0]);
const geoOf = views.map(([lat0, lon0]) => pts.map(([x, y]) => { const sx = x / R, sy = -y / R, z = Math.sqrt(1 - sx * sx - sy * sy), l0 = lat0 * D, lat = Math.asin(sy * Math.cos(l0) + z * Math.sin(l0)), lon = lon0 * D + Math.atan2(sx, z * Math.cos(l0) - sy * Math.sin(l0)); let lo = lon / D; lo = ((lo + 180) % 360 + 360) % 360 - 180; return [lo, lat / D]; }));
for (const b of globalThis.SURFACES) { const S = b.surf; let bad = 0; const t0 = Date.now(); const ex = [];
  for (const p of S.parts) { // un anneau tout petit n'est jamais fautif de façon visible : on audite les anneaux d'au moins 0,5 deg²
    if (p.a < 0.5) continue; let worst = 0;
    views.forEach(([lat0, lon0], vi) => { const subs = polylines(LC([p.ring], lat0, lon0, 0, 0, R)); let m = 0; pts.forEach(([x, y], k) => { if ((inRing(geoOf[vi][k][0], geoOf[vi][k][1], p.ring)) !== (winding(x, y, subs) !== 0)) m++; }); worst = Math.max(worst, m); });
    if (worst > 8) { bad++; if (ex.length < 3) ex.push(S.parts.indexOf(p)); } }
  console.log(b.name.padEnd(9), 'anneaux', String(S.parts.length).padStart(5), '| fautifs (> 8 écarts sur', pts.length, 'pts) :', bad, ex.length ? JSON.stringify(ex) : '', '|', ((Date.now() - t0) / 1000).toFixed(0) + ' s'); }
