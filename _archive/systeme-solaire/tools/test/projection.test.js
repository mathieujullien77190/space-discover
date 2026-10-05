const ROOT = require('path').join(__dirname, '..', '..');
// Vérifie que landCommands remplit les bonnes zones : compare, pour des points du disque visible, le remplissage prévu (règle non nulle sur les chemins projetés)
// et la vérité (point dans les anneaux, test planaire lon/lat valable car les polygones sont des morceaux plats coupés à ±180°).
const fs = require('fs');
let src = require(ROOT + '/tools/load-page.js')();
const mkEl = () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {} }, append() {}, addEventListener() {}, querySelectorAll() { return []; }, setPointerCapture() {}, getContext() { return ctx; }, innerHTML: '' });
const ctx = new Proxy({}, { get: (t, k) => k === 'createRadialGradient' || k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : k in t ? t[k] : () => {}, set: (t, k, v) => { t[k] = v; return true; } });
globalThis.document = { getElementById: () => mkEl(), createElement: () => mkEl(), activeElement: null };
globalThis.innerWidth = 1200; globalThis.innerHeight = 800; globalThis.devicePixelRatio = 1; globalThis.addEventListener = () => {};
globalThis.requestAnimationFrame = () => {}; globalThis.Path2D = class { moveTo() {} lineTo() {} arc() {} closePath() {} rect() {} addPath() {} }; globalThis.performance = { now: () => 0 };
new Function(src.replace(/requestAnimationFrame\(loop\);\s*$/, '') + 'globalThis.LC = landCommands; globalThis.MG = MARS_GEO;')();
const LC = globalThis.LC;
const load = f => { const o = {}; new Function('o', fs.readFileSync(f, 'utf8').replace(/const (\w+) = /, 'o.G = ') )(o); return o.G; };
const toRings = (G, cls) => G.parts.filter(p => p[0] === cls).map(p => { const r = []; for (let i = 0; i < p[1].length; i += 2) r.push([p[1][i] / 10, p[1][i + 1] / 10]); let s = 0; for (let i = 0; i < r.length; i++) { const j = (i + 1) % r.length; s += r[i][0] * r[j][1] - r[j][0] * r[i][1]; } r.ccw = s > 0; return r; });
function polylines(cmds, R) {   // commandes -> sous-chemins en polylignes (arcs échantillonnés)
  const subs = []; let cur = null, last = null;
  for (const c of cmds) {
    if (c[0] === 'M') { cur = [[c[1], c[2]]]; subs.push(cur); last = [c[1], c[2]]; }
    else if (c[0] === 'L') { cur.push([c[1], c[2]]); last = [c[1], c[2]]; }
    else if (c[0] === 'A') { const [, x, y, acw, , a0, a1] = c; let d = a1 - a0; const T = Math.PI * 2; if (acw) { d = -(((a0 - a1) % T + T) % T); } else { d = ((a1 - a0) % T + T) % T; } for (let i = 1; i <= 24; i++) { const a = a0 + d * i / 24; cur.push([Math.cos(a) * R, Math.sin(a) * R]); } cur.push([x, y]); }
  }
  return subs;
}
function winding(px, py, subs) { let w = 0; for (const s of subs) for (let i = 0; i < s.length; i++) { const a = s[i], b = s[(i + 1) % s.length]; if (a[1] <= py) { if (b[1] > py && (b[0] - a[0]) * (py - a[1]) - (px - a[0]) * (b[1] - a[1]) > 0) w++; } else if (b[1] <= py && (b[0] - a[0]) * (py - a[1]) - (px - a[0]) * (b[1] - a[1]) < 0) w--; } return w; }
const inRing = (x, y, p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i][1] > y) !== (p[j][1] > y) && x < (p[j][0] - p[i][0]) * (y - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]) c = !c; return c; };
function test(name, rings, mode) {
  let bad = 0, tot = 0, seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, R = 100, D = Math.PI / 180;
  for (const [lat0, lon0] of [[25, 0], [25, 90], [25, 180], [25, -90], [-30, 45], [60, -135], [-70, 10], [10, 130]]) {
    const cmds = LC(rings, lat0, lon0, 0, 0, R), subs = polylines(cmds, R);
    for (let n = 0; n < 400; n++) {
      const x = (rnd() * 2 - 1) * R, y = (rnd() * 2 - 1) * R; if (x * x + y * y > R * R * 0.98) continue;
      const sx = x / R, sy = -y / R, z = Math.sqrt(1 - sx * sx - sy * sy), l0 = lat0 * D;
      const lat = Math.asin(sy * Math.cos(l0) + z * Math.sin(l0)), lon = lon0 * D + Math.atan2(sx, z * Math.cos(l0) - sy * Math.sin(l0));
      let lo = lon / D; lo = ((lo + 180) % 360 + 360) % 360 - 180;
      const truth = mode === 'evenodd' ? rings.reduce((a, r) => a + (inRing(lo, lat / D, r) ? 1 : 0), 0) % 2 === 1 : rings.some(r => inRing(lo, lat / D, r));
      const pred = winding(x, y, subs) !== 0; tot++; if (truth !== pred) bad++;
    }
  }
  console.log(name.padEnd(34), 'écart', (100 * bad / tot).toFixed(1) + ' %', '(' + bad + '/' + tot + ')', 'anneaux', rings.length);
}
const moon = load(ROOT + '/js/surface-moon.js');
const mars = globalThis.MG;
test('Lune · mers (avec trous)', toRings(moon, 0), 'evenodd');
test('Lune · hautes terres (avec trous)', toRings(moon, 1), 'evenodd');
test('Lune · cratères jeunes', toRings(moon, 6), 'evenodd');
test('Mars · hautes terres (ext. seuls)', toRings(mars, 0), 'union');
test('Mars · polaire', toRings(mars, 6), 'union');
test('Mars · volcans', toRings(mars, 2), 'union');
for (const [n, f, nc] of [['Io', 'surface-io.js', 9], ['Europe', 'surface-europa.js', 4], ['Ganymède', 'surface-ganymede.js', 6]]) { const G = load(ROOT + '/js/' + f); for (const c of [0, 1, 2].filter(c => c < nc)) test(n + ' · classe ' + c, toRings(G, c), 'evenodd'); }
// vérité par somme des orientations (règle non nulle) : correcte même si des polygones d'une même classe se chevauchent
{ const G = load(ROOT + '/js/surface-ganymede.js'), rings = toRings(G, 1);
  const orient = r => { let s = 0; for (let i = 0; i < r.length; i++) { const j = (i + 1) % r.length; s += r[i][0] * r[j][1] - r[j][0] * r[i][1]; } return s < 0 ? 1 : -1; };
  const sg = rings.map(orient); let bad = 0, tot = 0, seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, R = 100, D = Math.PI / 180;
  for (const [lat0, lon0] of [[25, 0], [25, 90], [25, 180], [25, -90], [-30, 45], [60, -135], [-70, 10], [10, 130]]) {
    const subs = polylines(LC(rings, lat0, lon0, 0, 0, R), R);
    for (let n = 0; n < 400; n++) { const x = (rnd() * 2 - 1) * R, y = (rnd() * 2 - 1) * R; if (x * x + y * y > R * R * 0.98) continue;
      const sx = x / R, sy = -y / R, z = Math.sqrt(1 - sx * sx - sy * sy), l0 = lat0 * D, lat = Math.asin(sy * Math.cos(l0) + z * Math.sin(l0)), lon = lon0 * D + Math.atan2(sx, z * Math.cos(l0) - sy * Math.sin(l0));
      let lo = lon / D; lo = ((lo + 180) % 360 + 360) % 360 - 180;
      let w = 0; rings.forEach((r, i) => { if (inRing(lo, lat / D, r)) w += sg[i]; }); tot++; if ((w !== 0) !== (winding(x, y, subs) !== 0)) bad++; } }
  console.log('Ganymède · terrains clairs, vérité = somme des orientations : écart', (100 * bad / tot).toFixed(1) + ' %', '(' + bad + '/' + tot + ')'); }
{ const G = load(ROOT + '/js/surface-ganymede.js'), rings = toRings(G, 1);
  const orient = r => { let s = 0; for (let i = 0; i < r.length; i++) { const j = (i + 1) % r.length; s += r[i][0] * r[j][1] - r[j][0] * r[i][1]; } return s < 0 ? 1 : -1; };
  const sg = rings.map(orient); const R = 100, D = Math.PI / 180; let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const stat = { truthOnly: [], predOnly: [] };
  for (const [lat0, lon0] of [[25, 0], [25, 90], [25, 180], [25, -90]]) { const subs = polylines(LC(rings, lat0, lon0, 0, 0, R), R);
    for (let n = 0; n < 500; n++) { const x = (rnd() * 2 - 1) * R, y = (rnd() * 2 - 1) * R; if (x * x + y * y > R * R * 0.98) continue;
      const sx = x / R, sy = -y / R, z = Math.sqrt(1 - sx * sx - sy * sy), l0 = lat0 * D, lat = Math.asin(sy * Math.cos(l0) + z * Math.sin(l0)), lon = lon0 * D + Math.atan2(sx, z * Math.cos(l0) - sy * Math.sin(l0));
      let lo = lon / D; lo = ((lo + 180) % 360 + 360) % 360 - 180; let w = 0, cnt = 0; rings.forEach((r, i) => { if (inRing(lo, lat / D, r)) { w += sg[i]; cnt++; } });
      const t = w !== 0, p = winding(x, y, subs) !== 0; if (t && !p) stat.truthOnly.push([lo.toFixed(0), (lat / D).toFixed(0), w, cnt]); if (!t && p) stat.predOnly.push([lo.toFixed(0), (lat / D).toFixed(0), w, cnt]); } }
  console.log('vrai mais pas rempli :', stat.truthOnly.length, JSON.stringify(stat.truthOnly.slice(0, 8)));
  console.log('rempli mais pas vrai :', stat.predOnly.length, JSON.stringify(stat.predOnly.slice(0, 8)));
  const ws = {}; rings.forEach((r, i) => ws[sg[i]] = (ws[sg[i]] || 0) + 1); console.log('orientations des anneaux (ext=+1, trou=-1)', JSON.stringify(ws)); }
{ const G = load(ROOT + '/js/surface-ganymede.js'), rings = toRings(G, 1), R = 100, D = Math.PI / 180; const bad = [];
  const pts = []; let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let n = 0; n < 160; n++) { const x = (rnd() * 2 - 1) * R, y = (rnd() * 2 - 1) * R; if (x * x + y * y < R * R * 0.98) pts.push([x, y]); }
  for (const [lat0, lon0] of [[25, 0], [25, 120], [25, -120]]) {
    const geo = pts.map(([x, y]) => { const sx = x / R, sy = -y / R, z = Math.sqrt(1 - sx * sx - sy * sy), l0 = lat0 * D, lat = Math.asin(sy * Math.cos(l0) + z * Math.sin(l0)), lon = lon0 * D + Math.atan2(sx, z * Math.cos(l0) - sy * Math.sin(l0)); let lo = lon / D; lo = ((lo + 180) % 360 + 360) % 360 - 180; return [lo, lat / D]; });
    rings.forEach((r, i) => { const subs = polylines(LC([r], lat0, lon0, 0, 0, R), R); let m = 0; pts.forEach(([x, y], k) => { const t = inRing(geo[k][0], geo[k][1], r), p = winding(x, y, subs) !== 0; if (t !== p) m++; }); if (m > 6) bad.push([i, m, r.length / 2, lat0, lon0]); }); }
  console.log('anneaux (un par un) avec > 6 écarts sur 160 :', bad.length); console.log(JSON.stringify(bad.slice(0, 12)));
  if (bad[0]) { const r = rings[bad[0][0]]; let a = 1e9, b = -1e9, c = 1e9, d = -1e9; r.forEach(([x, y]) => { a = Math.min(a, x); b = Math.max(b, x); c = Math.min(c, y); d = Math.max(d, y); }); console.log('premier : lon', a, b, 'lat', c, d, 'points', r.length); } }
{ const G = load(ROOT + '/js/surface-ganymede.js'), rings = toRings(G, 1), r = rings[9];
  console.log('anneau #9 :', r.length, 'points'); console.log(JSON.stringify(r.map(p => p.join(','))).slice(0, 700));
  const cmds = LC([r], 25, -120, 0, 0, 100); console.log('commandes', cmds.length, cmds.filter(c => c[0] === 'A').length, 'arcs'); }
{ const G = load(ROOT + '/js/surface-ganymede.js'), r = toRings(G, 1)[9], R = 100, D = Math.PI / 180; let seed = 9; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const [lat0, lon0] of [[25, -120], [25, 0], [-20, -90], [-60, -90], [0, -90]]) { const cmds = LC([r], lat0, lon0, 0, 0, R), subs = polylines(cmds, R); let t = 0, p = 0, n = 0;
    for (let k = 0; k < 3000; k++) { const x = (rnd() * 2 - 1) * R, y = (rnd() * 2 - 1) * R; if (x * x + y * y > R * R * 0.98) continue; const sx = x / R, sy = -y / R, z = Math.sqrt(1 - sx * sx - sy * sy), l0 = lat0 * D, lat = Math.asin(sy * Math.cos(l0) + z * Math.sin(l0)), lon = lon0 * D + Math.atan2(sx, z * Math.cos(l0) - sy * Math.sin(l0)); let lo = lon / D; lo = ((lo + 180) % 360 + 360) % 360 - 180; n++; if (inRing(lo, lat / D, r)) t++; if (winding(x, y, subs) !== 0) p++; }
    console.log('vue lat', lat0, 'lon', lon0, ': points', n, '| dans l\'anneau (vérité)', t, '| remplis par le rendu', p, '| commandes', cmds.map(c => c[0]).join('')); } }
{ const G = load(ROOT + '/js/surface-ganymede.js'); G.parts.forEach(([c, flat], idx) => { let j = false; for (let i = 0; i < flat.length; i += 2) { const k = (i + 2) % flat.length; if (Math.abs(flat[i] - flat[k]) > 1800) j = true; } if (j) { const r = []; for (let i = 0; i < flat.length; i += 2) r.push((flat[i] / 10) + ',' + (flat[i + 1] / 10)); console.log('anneau avec saut : classe', c, 'index', idx, 'points', r.length); console.log(r.join(' ').slice(0, 900)); } }); }
{ const G = load(ROOT + '/js/surface-ganymede.js'), rings = toRings(G, 1), R = 100, D = Math.PI / 180; const bad = [];
  const pts = []; let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let n = 0; n < 120; n++) { const x = (rnd() * 2 - 1) * R, y = (rnd() * 2 - 1) * R; if (x * x + y * y < R * R * 0.98) pts.push([x, y]); }
  const views = []; for (const lat0 of [25, -30, 60, -70, 0]) for (let lon0 = -180; lon0 < 180; lon0 += 45) views.push([lat0, lon0]);
  for (const [lat0, lon0] of views) {
    const geo = pts.map(([x, y]) => { const sx = x / R, sy = -y / R, z = Math.sqrt(1 - sx * sx - sy * sy), l0 = lat0 * D, lat = Math.asin(sy * Math.cos(l0) + z * Math.sin(l0)), lon = lon0 * D + Math.atan2(sx, z * Math.cos(l0) - sy * Math.sin(l0)); let lo = lon / D; lo = ((lo + 180) % 360 + 360) % 360 - 180; return [lo, lat / D]; });
    rings.forEach((r, i) => { const subs = polylines(LC([r], lat0, lon0, 0, 0, R), R); let m = 0; pts.forEach(([x, y], k) => { const t = inRing(geo[k][0], geo[k][1], r), p = winding(x, y, subs) !== 0; if (t !== p) m++; }); if (m > 8) bad.push([i, m, r.length, r.ccw ? 'ccw' : 'cw', lat0, lon0]); }); }
  console.log('anneaux fautifs (> 8 écarts sur ~100) sur', views.length, 'vues :', bad.length); console.log(JSON.stringify(bad.slice(0, 10)));
  if (bad[0]) { const r = rings[bad[0][0]]; console.log(r.map(p => p.join(',')).join(' ').slice(0, 600)); } }
