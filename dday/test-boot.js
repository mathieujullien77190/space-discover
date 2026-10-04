// node dday/test-boot.js : démarre la page dday dans Node (vrai three.js, faux DOM et faux rendu) et fait tourner quelques images
const fs = require('fs'), vm = require('vm'), path = require('path');
const els = {};
const el = () => ({ style: {}, textContent: '', addEventListener() {}, setPointerCapture() {}, getContext: () => null });
let frames = [];
const sb = { console, Math, Date, JSON, Float32Array, Float64Array, Uint8Array, Uint16Array, Uint32Array, Int32Array, ArrayBuffer, Promise, innerWidth: 1200, innerHeight: 800, devicePixelRatio: 1,
  document: { getElementById: id => els[id] || (els[id] = Object.assign(el(), { classList: { toggle() {} }, onclick: null })), createElement: () => Object.assign(el(), { width: 0, height: 0, getContext: () => null }), createElementNS: () => el() }, performance: { now: () => 0 }, addEventListener() {}, visualViewport: null, requestAnimationFrame: f => { frames.push(f); } };
sb.window = sb; vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'js/vendor/three.min.js'), 'utf8'), sb);
vm.runInContext('THREE.WebGLRenderer = class { setPixelRatio() {} setSize() {} render() {} };', sb);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'js/ship.js'), 'utf8'), sb, { filename: 'js/ship.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'js/main.js'), 'utf8'), sb, { filename: 'js/main.js' });
let t = 0; const run = n => { for (let i = 0; i < n; i++) { const fs_ = frames; frames = []; t += 16; for (const f of fs_) f(t); } };
run(200); els.bS10.onclick();   // scénario à ×10 : arrivée, échouage, rampe, débarquement, départ, nouvelle arrivée
const phases = new Set(); for (let k = 0; k < 120; k++) { run(100); const m = /· (la barge approche|échouée[^·]*|débarquement|la barge repart) ·/.exec(els.info.textContent); if (m) phases.add(m[1]); }
console.log('dday : 12 200 images sans erreur ; étapes vues : ' + [...phases].join(' → ') + ' ; dernier état : ' + els.info.textContent);
