// node dday/test-boot.js : démarre la page dday dans Node (vrai three.js, faux DOM et faux rendu) et fait tourner quelques images
const fs = require('fs'), vm = require('vm'), path = require('path');
const el = () => ({ style: {}, textContent: '', addEventListener() {}, setPointerCapture() {}, getContext: () => null });
let frames = [];
const sb = { console, Math, Date, JSON, Float32Array, Float64Array, Uint8Array, Uint16Array, Uint32Array, Int32Array, ArrayBuffer, Promise, innerWidth: 1200, innerHeight: 800, devicePixelRatio: 1,
  document: { getElementById: () => el(), createElement: () => el(), createElementNS: () => el() }, performance: { now: () => 0 }, addEventListener() {}, visualViewport: null, requestAnimationFrame: f => { frames.push(f); } };
sb.window = sb; vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'js/vendor/three.min.js'), 'utf8'), sb);
vm.runInContext('THREE.WebGLRenderer = class { setPixelRatio() {} setSize() {} render() {} };', sb);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'js/main.js'), 'utf8'), sb, { filename: 'js/main.js' });
let t = 0; for (let i = 0; i < 200; i++) { const fs_ = frames; frames = []; t += 16; for (const f of fs_) f(t); }
console.log('dday : 200 images sans erreur');
