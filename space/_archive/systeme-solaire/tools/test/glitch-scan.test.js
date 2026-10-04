// Balayage fin des vues : pour chaque anneau assez grand, on compte les vues (pas de 0,5° en longitude, 5 latitudes) où le remplissage projeté s'écarte de la vérité planaire.
// Un écart massif (disque entier rempli) arrive quand un anneau frôle l'horizon ; ce test mesure à quelle fréquence.
const ROOT = require('path').join(__dirname, '..', '..');
let src = require(ROOT + '/tools/load-page.js')();
const mkEl = () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {} }, append() {}, addEventListener() {}, querySelectorAll() { return []; }, setPointerCapture() {}, getContext() { return ctx; }, innerHTML: '' });
const ctx = new Proxy({}, { get: (t, k) => k === 'createRadialGradient' || k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : k in t ? t[k] : () => {}, set: (t, k, v) => { t[k] = v; return true; } });
globalThis.document = { getElementById: () => mkEl(), createElement: () => mkEl(), activeElement: null };
globalThis.innerWidth = 1200; globalThis.innerHeight = 800; globalThis.devicePixelRatio = 1; globalThis.addEventListener = () => {};
globalThis.requestAnimationFrame = () => {}; globalThis.Path2D = class { moveTo() {} lineTo() {} arc() {} closePath() {} rect() {} addPath() {} }; globalThis.performance = { now: () => 0 };
new Function(src.replace(/requestAnimationFrame\(loop\);\s*$/, '') + 'globalThis.LC = landCommands; globalThis.SAFE = (rs, a, b, x, y, z) => safeLandCommands(rs[0], a, b, x, y, z); globalThis.SURFACES = SURFACES;')();
const LC = globalThis.LC, D = Math.PI / 180, R = 100, only = process.argv[2];
function polylines(cmds) { const subs = []; let cur = null; for (const c of cmds) { if (c[0] === 'M') { cur = [[c[1], c[2]]]; subs.push(cur); } else if (c[0] === 'L') cur.push([c[1], c[2]]); else if (c[0] === 'A') { const [, x, y, acw, , a0, a1] = c, T = Math.PI * 2; const d = acw ? -(((a0 - a1) % T + T) % T) : ((a1 - a0) % T + T) % T; for (let i = 1; i <= 24; i++) { const a = a0 + d * i / 24; cur.push([Math.cos(a) * R, Math.sin(a) * R]); } cur.push([x, y]); } } return subs; }
const wind = (x, y, r) => { let w = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[j], b = r[i]; if (a[1] <= y) { if (b[1] > y && (b[0] - a[0]) * (y - a[1]) - (x - a[0]) * (b[1] - a[1]) > 0) w++; } else if (b[1] <= y && (b[0] - a[0]) * (y - a[1]) - (x - a[0]) * (b[1] - a[1]) < 0) w--; } return w; };
const pts = []; let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
for (let n = 0; n < 60; n++) { const x = (rnd() * 2 - 1) * R, y = (rnd() * 2 - 1) * R; if (x * x + y * y < R * R * 0.98) pts.push([x, y]); }
for (const b of globalThis.SURFACES) { if (!b.surf.parts.length || (only && b.id !== only)) continue;
  const rings = b.surf.parts.filter(p => p.a >= 2).map(p => p.ring); let bad = 0, worst = []; const total = rings.length * 720 * 5;
  for (const lat0 of [-60, -25, 0, 25, 60]) for (let lon0 = -180; lon0 < 180; lon0 += 0.5) {
    const geo = pts.map(([x, y]) => { const sx = x / R, sy = -y / R, z = Math.sqrt(1 - sx * sx - sy * sy), l0 = lat0 * D, lat = Math.asin(sy * Math.cos(l0) + z * Math.sin(l0)), lon = lon0 * D + Math.atan2(sx, z * Math.cos(l0) - sy * Math.sin(l0)); return [((lon / D + 180) % 360 + 360) % 360 - 180, lat / D]; });
    rings.forEach((r, i) => { const c = globalThis.SAFE([r], lat0, lon0, 0, 0, R); const subs = c.length ? polylines(c) : []; let m = 0; for (let k = 0; k < pts.length; k++) { let pw = 0; for (const s of subs) pw += wind(pts[k][0], pts[k][1], s); if ((wind(geo[k][0], geo[k][1], r) !== 0) !== (pw !== 0)) m++; } if (m > 12) { bad++; if (worst.length < 4) worst.push([i, lat0, lon0]); } }); }
  console.log(b.name.padEnd(9), 'anneaux ≥ 2 deg² :', String(rings.length).padStart(4), '| vues fautives :', String(bad).padStart(4), '/', total, '(' + (100 * bad / total).toFixed(3) + ' %)', bad ? JSON.stringify(worst) : ''); }
