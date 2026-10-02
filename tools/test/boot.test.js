// Démarrage de la page dans Node (vrai three.js, faux DOM, faux moteur de rendu) : détecte les erreurs JavaScript au chargement et pendant quelques images, dans chaque vue.
// node tools/test/boot.test.js
const fs = require('fs'), vm = require('vm'), path = require('path'), root = path.join(__dirname, '..', '..');
const ctx2d = new Proxy({}, { get: (t, k) => (k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
const els = {};
const mkEl = (id) => { const e = { id, style: {}, dataset: {}, children: [], hidden: false, textContent: '', innerHTML: '', value: 'earth', checked: false, width: 0, height: 0, clientHeight: 800, offsetWidth: 50,
  classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, toggle(c, on) { (on === undefined ? !this._s.has(c) : on) ? this._s.add(c) : this._s.delete(c); }, contains(c) { return this._s.has(c); } },
  append() {}, appendChild() {}, prepend() {}, remove() {}, addEventListener() {}, setPointerCapture() {}, getContext: () => ctx2d, getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }), blur() {}, querySelectorAll: () => [], setAttribute() {} }; return e; };
const document = { getElementById: id => els[id] || (els[id] = mkEl(id)), createElement: t => mkEl(t), createElementNS: () => mkEl('ns'), createRange: () => ({ selectNodeContents() {} }), body: mkEl('body'), querySelectorAll: () => [] };
let frames = [], raf = 0;
const sandbox = { console, Math, Date, JSON, Float32Array, Float64Array, Uint8Array, Uint8ClampedArray, Uint16Array, Uint32Array, Int32Array, ArrayBuffer, Promise, setTimeout: (f, d) => { sandbox.__timers.push([f, d]); return 0; }, clearTimeout() {}, setInterval() { return 0; }, clearInterval() {},
  performance: { now: () => sandbox.__now }, innerHeight: 800, innerWidth: 1200, devicePixelRatio: 1, document, location: { protocol: 'file:' }, navigator: {}, localStorage: { getItem: () => null, setItem() {} },
  matchMedia: () => ({ matches: false }), addEventListener() {}, getSelection: () => ({ removeAllRanges() {}, addRange() {} }), fetch: () => Promise.reject(new Error('pas de réseau')), Image: function () {},
  requestAnimationFrame: f => { frames.push(f); return ++raf; }, __timers: [], __now: 0 };
sandbox.window = sandbox; sandbox.self = sandbox; sandbox.visualViewport = null; vm.createContext(sandbox);
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8'), srcs = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
const errors = [];
for (const f of srcs) {
  try { vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox, { filename: f }); }
  catch (e) { errors.push('chargement de ' + f + ' : ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n')); }
  if (f.endsWith('three.min.js')) {   // faux rendu (pas de WebGL dans Node)
    vm.runInContext(`THREE.WebGLRenderer = class { constructor() { this.capabilities = { maxTextureSize: 8192, getMaxAnisotropy: () => 8 }; this.domElement = {}; } setPixelRatio() {} setSize() {} render(sc, cam) { (globalThis.__log = globalThis.__log || []).push([cam.position.x, cam.position.y, cam.position.z]); } };`, sandbox);
  }
}
// quelques images dans chaque vue
const step = (n, label) => { for (let i = 0; i < n; i++) { const fs_ = frames; frames = []; sandbox.__now += 16; for (const f of fs_) { try { f(sandbox.__now); } catch (e) { errors.push(label + ' : ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')); return false; } } } return true; };
const timers = () => { const t = sandbox.__timers.splice(0); for (const [f] of t) try { f(); } catch (e) { errors.push('minuterie : ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')); } };
step(3, 'premières images'); timers(); step(5, 'après création du Soleil et de la Lune');
const sel = els.viewSel; let ok = true;
for (const v of ['iss', 'moon', 'sun', 'earth']) { if (!els.viewSel.onchange) { errors.push('viewSel.onchange absent'); break; } sel.value = v; try { sel.onchange(); } catch (e) { errors.push('vue ' + v + ' : ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n')); } step(40, 'vue ' + v); }
// trajectoire de la caméra pendant le zoom sur l'ISS : jamais sous la surface, jamais non finie
if (process.argv[2] === 'iss') { sandbox.__log = []; sel.value = 'iss'; sel.onchange(); step(1500, 'zoom ISS'); const L = sandbox.__log, nan = L.filter(p => !p.every(Number.isFinite)).length, r = L.map(p => Math.hypot(...p)), pts = [0, 60, 120, 240, 480, 800, 1200, 1499].filter(i => i < L.length).map(i => (i + ': ' + ((r[i] - 1) * 6378).toFixed(0) + ' km au-dessus du centre-1')); console.log('zoom ISS : ' + L.length + ' images, non finies ' + nan + ', altitude mini ' + ((Math.min(...r) - 1) * 6378).toFixed(1) + ' km ; ' + pts.join(' | ')); }
console.log(errors.length ? 'ERREURS :\n' + errors.join('\n---\n') : 'démarrage et vues Terre / ISS / Lune / Soleil sans erreur (' + srcs.length + ' scripts)');
