const ROOT = require('path').join(__dirname, '..', '..');
const fs = require('fs');
let s = require(ROOT + '/tools/load-page.js')();
const mkEl = () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {} }, append() {}, addEventListener() {}, querySelectorAll() { return []; }, setPointerCapture() {}, getContext() { return ctx; }, innerHTML: '' });
const ctx = new Proxy({}, { get: (t, k) => k === 'createRadialGradient' || k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : k in t ? t[k] : () => {}, set: (t, k, v) => { t[k] = v; return true; } });
globalThis.document = { getElementById: () => mkEl(), createElement: () => mkEl(), activeElement: null };
globalThis.innerWidth = 1200; globalThis.innerHeight = 800; globalThis.devicePixelRatio = 1; globalThis.addEventListener = () => {};
globalThis.requestAnimationFrame = () => {}; globalThis.Path2D = class { moveTo() {} lineTo() {} arc() {} closePath() {} rect() {} addPath() {} }; globalThis.performance = { now: () => 0 };
s = s.replace(/requestAnimationFrame\(loop\);\s*$/, '') + `
globalThis.T = { SUN, PLANETS, PROBES, COMETS, METEORITES, focusOn, selectMeteo, startReplay, replayStep, draw, computePositions, probePos3, cometPos3, set logR(v) { logR = v; }, set logTarget(v) { logTarget = v; }, SL_MIN, SL_MAX, AU, J2000, DAYMS, updateScale, updateDate, showInfo, showInfoLive, buildChips, get simT() { return simT; }, set simT(v) { simT = v; }, get pos() { return pos; }, get speed() { return speed; }, get playing() { return playing; }, D, EARTHB };`;
new Function(s)();
const T = globalThis.T, AU = T.AU;
const au = p => Math.hypot(...p) / AU;
const chk = (name, v, lo, hi) => console.log((v >= lo && v <= hi ? 'OK  ' : 'FAIL') + ' ' + name + ' = ' + v.toFixed(2) + ' (attendu ' + lo + '–' + hi + ')');
const P = id => T.PROBES.find(p => p.id === id), C = id => T.COMETS.find(c => c.id === id);
const now = T.D('2026-10-01');
// sondes : distances repères
chk('V1 1990 (UA)', au(T.probePos3(P('voyager1'), T.D('1990-02-14'))), 36, 44);
chk('V1 2012 (UA)', au(T.probePos3(P('voyager1'), T.D('2012-08-25'))), 120, 123);
chk('V1 2026 (UA)', au(T.probePos3(P('voyager1'), now)), 165, 180);
chk('V2 2018 (UA)', au(T.probePos3(P('voyager2'), T.D('2018-11-05'))), 118, 120);
chk('V2 2026 (UA)', au(T.probePos3(P('voyager2'), now)), 135, 150);
chk('P10 2003 (UA)', au(T.probePos3(P('pioneer10'), T.D('2003-01-23'))), 79, 81);
chk('P11 1995 (UA)', au(T.probePos3(P('pioneer11'), T.D('1995-11-24'))), 44, 46);
chk('NH 2019 (UA)', au(T.probePos3(P('newhorizons'), T.D('2019-01-01'))), 43, 44);
chk('NH 2026 (UA)', au(T.probePos3(P('newhorizons'), now)), 58, 72);
chk('Juno 2026 près de Jupiter (UA)', au(T.probePos3(P('juno'), now)), 4.9, 5.5);
chk('Parker r mini (UA)', Math.min(...Array.from({ length: 200 }, (_, i) => au(T.probePos3(P('parker'), T.D('2024-12-01') + i * 0.5)))), 0.04, 0.05);
chk('JWST L2 - Terre (millions km)', (Math.hypot(...T.probePos3(P('jwst'), now)) - Math.hypot(...T.probePos3(P('clipper'), now).slice(0,0).concat(T.pos[3]))) / 1e6, 1.0, 2.0);
// continuité des sondes (pas de saut > 3 UA/jour hors Parker/orbites)
for (const p of T.PROBES) { let mx = 0, prev = T.probePos3(p, p.t0); for (let t = p.t0; t < Math.min(p.tEnd, T.D('2030-01-01')); t += 1) { const q = T.probePos3(p, t); mx = Math.max(mx, Math.hypot(q[0] - prev[0], q[1] - prev[1], q[2] - prev[2])); prev = q; } console.log('saut max/jour', p.id, (mx / 1e6).toFixed(1), 'M km'); }
// comètes : périhélie
for (const [id, d, qlo, qhi] of [['halley', '1986-02-09', 0.55, 0.62], ['halley', '2061-07-28', 0.55, 0.62], ['halebopp', '1997-04-01', 0.9, 0.93], ['hyakutake', '1996-05-01', 0.22, 0.24], ['neowise', '2020-07-03', 0.28, 0.31], ['encke', '2023-10-22', 0.32, 0.35], ['swifttuttle', '1992-12-11', 0.95, 0.97], ['tempeltuttle', '1998-02-28', 0.97, 0.99], ['ponsbrooks', '2024-04-21', 0.77, 0.79], ['oumuamua', '2017-09-09', 0.25, 0.26], ['borisov', '2019-12-08', 1.99, 2.02], ['atlas3i', '2025-10-29', 1.34, 1.37]]) chk('périhélie ' + id + ' ' + d + ' (UA)', au(T.cometPos3(C(id), T.D(d))), qlo, qhi);
chk('Halley aujourd\'hui (UA)', au(T.cometPos3(C('halley'), now)), 30, 36);
chk('Halley aphélie 2023 (UA)', au(T.cometPos3(C('halley'), T.D('2023-12-09'))), 34, 35.5);
chk('Hale-Bopp 2026 (UA)', au(T.cometPos3(C('halebopp'), now)), 60, 80);
chk('3I/ATLAS 2026 (UA)', au(T.cometPos3(C('atlas3i'), now)), 5, 20);
// dessin : tous les astres à plusieurs zooms
T.computePositions(now); T.simT = now;
const all = [T.SUN, ...T.PLANETS, ...T.PROBES, ...T.COMETS];
for (const b of all) { T.computePositions(T.simT); T.focusOn(b); for (const R of [1e4, 1e6, 3e7, 3e8, 8e9, 3e10, 1e12, 1e17, 1e18]) { T.logR = Math.log(R); T.draw(1); } T.showInfoLive(); }
for (const c of T.COMETS) { T.focusOn(c, 'orbit'); T.draw(1); }
for (const m of T.METEORITES) { T.selectMeteo(m); T.logR = Math.log(2e4); T.draw(1); T.showInfo(); }
// relecture de chaque sonde
for (const p of T.PROBES) { T.startReplay(p); let n = 0; while (n < 200000) { T.simT += T.speed * 0.016; T.computePositions(T.simT); T.replayStep(); if (!T.playing || T.speed < 1) break; n++; } console.log('relecture', p.id, 'fin', new Date(T.J2000 + T.simT * T.DAYMS).toISOString().slice(0, 10), 'pas', n); }
T.simT = T.SL_MIN; T.computePositions(T.simT); T.draw(1); T.simT = T.SL_MAX; T.computePositions(T.simT); T.draw(1); T.updateDate();
console.log('tout dessiné');
// calques : tout masquer puis réafficher, dessiner
{ const g = new Function(require(ROOT + '/tools/load-page.js')() + ';return {LAYERS,LAYER_DEFS,ensureLayerFor}');
}
