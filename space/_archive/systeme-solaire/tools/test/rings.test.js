const ROOT = require('path').join(__dirname, '..', '..');
let s = require(ROOT + '/tools/load-page.js')();
const mkEl = () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {} }, append() {}, addEventListener() {}, querySelectorAll() { return []; }, setPointerCapture() {}, getContext() { return ctx; }, innerHTML: '' });
let stopsAdded = 0, clips = 0;
const ctx = new Proxy({}, { get: (t, k) => k === 'createRadialGradient' || k === 'createLinearGradient' ? () => ({ addColorStop() { stopsAdded++; } }) : k === 'clip' ? () => { clips++; } : k in t ? t[k] : () => {}, set: (t, k, v) => { t[k] = v; return true; } });
globalThis.document = { getElementById: () => mkEl(), createElement: () => mkEl(), activeElement: null };
globalThis.innerWidth = 1200; globalThis.innerHeight = 800; globalThis.devicePixelRatio = 1; globalThis.addEventListener = () => {};
globalThis.requestAnimationFrame = () => {}; globalThis.Path2D = class { moveTo() {} lineTo() {} arc() {} closePath() {} rect() {} addPath() {} }; globalThis.performance = { now: () => 0 };
s = s.replace(/requestAnimationFrame\(loop\);\s*$/, '') + `globalThis.T = { RING_STOPS, RING_OUT, focusOn, draw, computePositions, PLANETS, set logR(v) { logR = v; } };`;
new Function(s)();
const T = globalThis.T, st = T.RING_STOPS;
let mono = true; for (let i = 1; i < st.length; i++) if (st[i][0] < st[i - 1][0]) mono = false;
console.log('stops', st.length, 'offsets croissants', mono, 'min/max', st[0][0], st[st.length - 1][0]);
// alpha à quelques rayons repères
const alphaAt = rKm => { const o = rKm / T.RING_OUT; let a = 0; for (let i = 0; i < st.length; i++) if (st[i][0] <= o) a = +st[i][1].match(/,([\d.]+)\)$/)[1]; return a; };
for (const [n, r] of [['D', 70000], ['C', 82000], ['Maxwell', 87550], ['B', 105000], ['Cassini', 119500], ['A', 128000], ['Encke', 133480], ['Keeler', 136505], ['Roche', 138000], ['F', 140180], ['G', 170000], ['E (Encelade)', 238000], ['E loin', 400000]]) console.log(n.padEnd(14), r, 'opacité', alphaAt(r).toFixed(3));
const sat = T.PLANETS[5]; T.computePositions(1000);
for (const R of [8e9, 3e8, 1e7, 1e6, 3e5, 1e5]) { stopsAdded = 0; clips = 0; T.focusOn(sat); T.logR = Math.log(R); T.draw(1); console.log('zoom', R, 'stops ajoutés', stopsAdded, 'clips', clips); }
