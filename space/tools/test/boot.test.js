// Démarrage de la page dans Node (vrai three.js, faux DOM, faux moteur de rendu) : détecte les erreurs JavaScript au chargement et pendant quelques images, dans chaque vue.
// node tools/test/boot.test.js
const fs = require('fs'), vm = require('vm'), path = require('path'), root = path.join(__dirname, '..', '..');
const ctx2d = new Proxy({}, { get: (t, k) => (k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
const els = {}, allEls = [];
const mkEl = (id) => { const e = { id, style: {}, dataset: {}, children: [], hidden: false, textContent: '', innerHTML: '', value: 'earth', checked: false, width: 0, height: 0, clientHeight: 800, offsetWidth: 50,
  classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, toggle(c, on) { (on === undefined ? !this._s.has(c) : on) ? this._s.add(c) : this._s.delete(c); }, contains(c) { return this._s.has(c); } },
  append(...k) { this.kids = (this.kids || []).concat(k); }, appendChild() {}, prepend() {}, remove() {}, addEventListener() {}, setPointerCapture() {}, getContext: () => ctx2d, getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }), blur() {}, querySelectorAll: () => [], setAttribute() {} }; allEls.push(e); return e; };
const htmlIds = new Set([...fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/id="([^"]+)"/g)].map(m => m[1]));
const document = { getElementById: id => htmlIds.has(id) ? (els[id] || (els[id] = mkEl(id))) : null, createElement: t => mkEl(t), createElementNS: () => mkEl('ns'), createRange: () => ({ selectNodeContents() {} }), body: mkEl('body'), querySelectorAll: s => (String(s).includes('data-sp') ? spBtns : []) };
let frames = [], raf = 0;
const FakeDate = class extends Date { static now() { return sandbox.__fakeNow; } constructor(...a) { if (a.length) super(...a); else super(sandbox.__fakeNow); } };
const spBtns = [1, 3600, 21600, 86400, 432000].map(v => ({ dataset: { sp: String(v) }, classList: { toggle() {}, add() {}, remove() {} }, onclick: null }));
const sandbox = { console, Math, Date: FakeDate, __fakeNow: Date.now(), JSON, Float32Array, Float64Array, Uint8Array, Uint8ClampedArray, Uint16Array, Uint32Array, Int32Array, ArrayBuffer, Promise, setTimeout: (f, d) => { sandbox.__timers.push([f, d]); return 0; }, clearTimeout() {}, setInterval() { return 0; }, clearInterval() {},
  performance: { now: () => sandbox.__now }, innerHeight: 800, innerWidth: 1200, devicePixelRatio: 1, document, location: { protocol: process.env.PROTO || 'file:' }, navigator: {}, localStorage: { getItem: () => null, setItem() {} },
  matchMedia: () => ({ matches: !!process.env.TOUCH }), addEventListener() {}, getSelection: () => ({ removeAllRanges() {}, addRange() {} }), fetch: () => Promise.reject(new Error('pas de réseau')), Image: function () {},
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
const step = (n, label) => { for (let i = 0; i < n; i++) { const fs_ = frames; frames = []; sandbox.__now += 16; sandbox.__fakeNow += 16; for (const f of fs_) { try { f(sandbox.__now); } catch (e) { errors.push(label + ' : ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')); return false; } } } return true; };
const timers = () => { const t = sandbox.__timers.splice(0); for (const [f] of t) try { f(); } catch (e) { errors.push('minuterie : ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')); } };
step(3, 'premières images'); timers(); step(5, 'après création du Soleil et de la Lune');
els.mtChk = els.mtChk || mkEl('mtChk'); els.dnChk = els.dnChk || mkEl('dnChk');
const sel = els.viewSel; const goView = v => { if (v === 'iss') { const it = allEls.find(e => e.className === 'sitem'); if (!it || !it.onclick) throw new Error('liste des satellites absente'); it.onclick(); } else { sel.value = v; sel.onchange(); } };
for (const sp of [86400, 432000, 1]) { const b = (els.timeBar && els.timeBar.__btns || []).find(x => +x.dataset.sp === sp); } let ok = true;
for (const mt of [false, true]) for (const dn of [false, true]) { els.mtChk.checked = mt; els.mtChk.onchange && els.mtChk.onchange(); els.dnChk.checked = dn; els.dnChk.onchange && els.dnChk.onchange(); for (const v of ['iss', 'moon', 'sun', 'earth']) { if (!els.viewSel.onchange) { errors.push('viewSel.onchange absent'); break; } try { goView(v); } catch (e) { errors.push('vue ' + v + ' : ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n')); } step(60, 'vue ' + v + ' mesures=' + mt + ' jour/nuit=' + dn); } }
// trajectoire de la caméra pendant le zoom sur l'ISS : jamais sous la surface, jamais non finie
if (process.argv[2] === 'iss') { sandbox.__log = []; goView('iss'); step(1500, 'zoom ISS'); const L = sandbox.__log, nan = L.filter(p => !p.every(Number.isFinite)).length, r = L.map(p => Math.hypot(...p)), pts = [0, 60, 120, 240, 480, 800, 1200, 1499].filter(i => i < L.length).map(i => (i + ': ' + ((r[i] - 1) * 6378).toFixed(0) + ' km au-dessus du centre-1')); console.log('zoom ISS : ' + L.length + ' images, non finies ' + nan + ', altitude mini ' + ((Math.min(...r) - 1) * 6378).toFixed(1) + ' km ; ' + pts.join(' | ')); }
// accès DIRECT aux vues (plus de transition) : dès les premières images la caméra est à sa place
{ const lastCam = () => { const L = sandbox.__log; return L[L.length - 1]; }, R = 6378.137;
  sandbox.__log = []; goView('iss'); step(3, 'accès ISS'); const d = Math.hypot(...lastCam()) * R; if (!(d > 0.3 && d < 0.5)) errors.push('accès direct à l ISS : caméra à ' + d.toFixed(3) + ' km de la station (attendu ≈ 0,39 km dès les premières images)');
  goView('earth'); step(3, 'accès Terre'); const e = Math.hypot(...lastCam()); if (!(e > 3.2 && e < 3.6)) errors.push('accès direct à la Terre : caméra à ' + e.toFixed(2) + ' rayons du centre (attendu 3,4 dès les premières images)');
  for (const v of ['moon', 'sun', 'earth']) { goView(v); step(3, 'accès ' + v); if (!lastCam().every(Number.isFinite)) errors.push('accès ' + v + ' : position non finie'); } }
// temps accéléré : 5 jours par seconde pendant 40 s simulées (> 60 jours : l'ISS sort de la validité du TLE), chaque vue
if (errors.length) { console.log('ERREURS :' + String.fromCharCode(10) + errors.join(String.fromCharCode(10) + '---' + String.fromCharCode(10))); process.exit(1); }
for (const sp of [1, 86400, 432000]) { spBtns.find(b => +b.dataset.sp === sp).onclick(); for (const v of ['earth', 'moon', 'sun', 'iss']) { goView(v); step(120, 'accéléré ×' + sp + ' vue ' + v); } }
// panneau « Satellites » : la liste (l'ISS) et ses options (Dimensions, Trajectoire) ; le sélecteur de vues ne contient plus que les astres
{ const items = allEls.filter(e => e.className === 'sitem'); if (items.length !== 1 || !/ISS/.test(items[0].textContent)) errors.push('liste des satellites : ' + items.length + ' entrée(s), attendu 1 (ISS)');
  const cbs = []; const walk = e => { if (e && e.type === 'checkbox') cbs.push(e); for (const k of (e && e.kids) || []) walk(k); }; walk(els.satsPanel);
  if (cbs.length !== 2) errors.push('options du satellite : ' + cbs.length + ' case(s), attendu 2 (Dimensions, Trajectoire)');
  els.satsPanel.hidden = true; els.bSats.onclick(); if (els.satsPanel.hidden) errors.push('bouton Satellites : le panneau ne souvre pas');
  goView('earth'); step(10, 'avant options'); for (const cb of cbs) { cb.checked = true; cb.onchange(); step(60, 'option satellite cochée'); } step(60, 'options cochées'); for (const cb of cbs) { cb.checked = false; cb.onchange(); } step(20, 'options décochées'); goView('earth'); step(20, 'retour Terre');
}
// lancement de satellite simple : Lancer, vitesses, vue de dessus, zoom fusée, caméra auto, arrêt (chaque base et type)
const btn = txt => allEls.filter(e => e.textContent === txt && e.onclick).pop();
(async () => {
for (const key of [null, 'starship500', 'obj:fusee-orbite-500km', 'obj:fusee-trop-lente']) {
  if (key) { const sel2 = allEls.filter(e => e.id === 'select').pop(); sel2.value = key; sel2.onchange && sel2.onchange(); }
  btn('🚀 Lancer').onclick(); await new Promise(r => setImmediate(r)); sandbox.__log = []; step(60, 'lancement'); { const q = sandbox.__log[sandbox.__log.length - 1], d = Math.hypot(...q) * 6378.137; if (!(d > 0.02 && d < 0.4)) errors.push('lancement ' + key + ' : caméra à ' + d.toFixed(3) + ' km de la fusée (attendu : tout près, 20 à 400 m)'); } { const tel = allEls.filter(e => e.className === 'ltel').pop(); if (!tel || !/Altitude/.test(tel.textContent)) errors.push('lancement ' + key + ' : télémétrie absente (le vol n’a pas démarré)'); } for (const sp of ['×60', '×200']) { btn(sp).onclick(); step(300, 'vitesse ' + sp); }
  btn('×200').onclick(); step(2500, 'vol complet'); btn('⏹ Arrêter').onclick(); step(30, 'arrêt'); }
})().then(() => console.log(errors.length ? 'ERREURS :\n' + errors.join('\n---\n') : 'démarrage et vues Terre / ISS / Lune / Soleil sans erreur (' + srcs.length + ' scripts)'));
