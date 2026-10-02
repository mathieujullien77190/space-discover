const ROOT = require('path').join(__dirname, '..', '..');
const fs = require('fs');
let s = require(ROOT + '/tools/load-page.js')();
const mkEl = () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {} }, append() {}, addEventListener() {}, querySelectorAll() { return []; }, setPointerCapture() {}, getContext() { return ctx; }, innerHTML: '' });
const ctx = new Proxy({}, { get: (t, k) => k === 'createRadialGradient' || k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : k in t ? t[k] : () => {}, set: (t, k, v) => { t[k] = v; return true; } });
globalThis.document = { getElementById: () => mkEl(), createElement: () => mkEl(), activeElement: null };
globalThis.innerWidth = 1200; globalThis.innerHeight = 800; globalThis.devicePixelRatio = 1; globalThis.addEventListener = () => {};
globalThis.requestAnimationFrame = () => {}; globalThis.Path2D = class { moveTo() {} lineTo() {} arc() {} closePath() {} rect() {} addPath() {} }; globalThis.performance = { now: () => 0 };
s = s.replace(/requestAnimationFrame\(loop\);\s*$/, '') + `globalThis.T = { PROBES, AU, kepProp, probePos3, MU };`;
new Function(s)();
const { PROBES, AU, probePos3 } = globalThis.T;
for (const p of PROBES) {
  if (!p.legs.length) continue;
  const out = p.legs.map((lg, i) => {
    if (!lg) return 'ÉCHEC';
    const a = p.nodes[i], b = p.nodes[i + 1]; let rmin = 1e99, rmax = 0;
    for (let k = 0; k <= 100; k++) { const q = probePos3(p, a.t + (b.t - a.t) * k / 100); const r = Math.hypot(q[0], q[1]) / AU; rmin = Math.min(rmin, r); rmax = Math.max(rmax, r); }
    const e = probePos3(p, b.t), err = Math.hypot(e[0] - b.pos[0], e[1] - b.pos[1]) / 1e3;
    return `${rmin.toFixed(2)}-${rmax.toFixed(2)}UA v=${Math.hypot(...lg.v1).toFixed(1)} err=${err.toFixed(0)}km`;
  });
  console.log(p.id.padEnd(12), out.join(' | '));
}
