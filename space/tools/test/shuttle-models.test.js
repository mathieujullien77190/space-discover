// Les VRAIS modèles glTF de la navette (objects/shuttle/*.glb, NASA) passent dans le vrai chargeur (js/gltf-mini.js) et le placement (js/stack-models.js), avec fetch / Image simulés sur le disque :
// on mesure la fusée assemblée (réservoir, 2 boosters, orbiteur) et on lance un Launch avec ces modèles. node tools/test/shuttle-models.test.js
const fs = require('fs'), vm = require('vm'), path = require('path'), root = path.join(__dirname, '..', '..');
const ctx2d = new Proxy({}, { get: (t, k) => (k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
class FakeImage { set src(v) { this._s = v; setTimeout(() => this.onload && this.onload(), 0); } get src() { return this._s; } }
const sandbox = { console, Math, Date, JSON, Float32Array, Float64Array, Uint8Array, Uint16Array, Uint32Array, Int32Array, Int16Array, Int8Array, ArrayBuffer, DataView, TextDecoder, Blob, URL, Promise, setTimeout, performance: { now: () => Date.now() }, innerHeight: 900, innerWidth: 1400, Image: FakeImage,
  fetch: url => { const f = path.join(root, url); if (!fs.existsSync(f)) return Promise.resolve({ ok: false, status: 404 }); const b = fs.readFileSync(f); return Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)) }); },
  document: { createElement: () => ({ width: 0, height: 0, getContext: () => ctx2d, style: {}, addEventListener() {} }), createElementNS: () => ({ style: {}, addEventListener() {}, setAttribute() {} }), getElementById: () => null } };
sandbox.window = sandbox; sandbox.self = sandbox; vm.createContext(sandbox);
for (const f of ['js/vendor/three.min.js', 'js/data/surface-earth.js', 'js/earth.js', 'js/physics.js', 'js/launch.js', 'js/rockets.js', 'js/story.js', 'js/flight-plan.js', 'js/flight-object.js', 'js/data/objects.js', 'js/gltf-mini.js', 'js/stack-models.js', 'js/launch-3d.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox, { filename: f });
const fails = [], check = (c, m) => { console.log((c ? 'ok   ' : 'ÉCHEC ') + m); if (!c) fails.push(m); };
(async () => {
  const t0 = Date.now(), models = await vm.runInContext('loadStackModels(FLIGHT_OBJECTS.shuttle, "objects/shuttle/")', sandbox);
  check(['core', 'booster', 'upper'].every(k => models[k]), 'modèles chargés : ' + Object.keys(models).join(', ') + ' (' + (Date.now() - t0) + ' ms)');
  sandbox.M = models;
  const info = vm.runInContext(`(() => {
    const f = x => Math.round(x * 100) / 100, bb = o => { o.updateMatrixWorld(true); return new THREE.Box3().setFromObject(o); }, cnt = o => { let m = 0, t = 0; o.traverse(c => { if (c.isMesh) { m++; t += (c.geometry.index ? c.geometry.index.count : c.geometry.attributes.position.count) / 3; } }); return [m, Math.round(t)]; };
    const r = {}; for (const k of ['core', 'booster', 'upper']) { const b = bb(M[k]), c = cnt(M[k]); r[k] = { min: [b.min.x, b.min.y, b.min.z].map(f), max: [b.max.x, b.max.y, b.max.z].map(f), meshes: c[0], tris: c[1] }; } return r; })()`, sandbox);
  for (const k of ['core', 'booster', 'upper']) console.log('   ' + k + ' : ' + info[k].meshes + ' maillages, ' + info[k].tris + ' triangles, boîte ' + JSON.stringify(info[k].min) + ' → ' + JSON.stringify(info[k].max));
  const c = info.core, b = info.booster, u = info.upper;
  check(Math.abs(c.max[1] - c.min[1] - 47.7) < 0.5 && Math.abs(c.min[1]) < 0.01 && Math.abs(c.max[0] + c.min[0]) < 0.3 && c.max[0] < 5, 'réservoir : ' + (c.max[1] - c.min[1]).toFixed(1) + ' m de haut, base à 0, centré, diamètre ' + (c.max[0] - c.min[0]).toFixed(1) + ' m');
  check(Math.abs(b.max[1] - b.min[1] - 45.2) < 0.5 && Math.abs(b.min[1]) < 0.01 && b.tris > 3000, 'booster : ' + (b.max[1] - b.min[1]).toFixed(1) + ' m de haut, base à 0, ' + b.tris + ' triangles');
  check(u.tris > 200000 && Math.abs(u.min[1] + 1) < 0.01 && u.max[1] > 30 && u.max[1] < 40 && Math.abs(u.min[0] - 5) < 0.01 && Math.abs(u.min[2] + u.max[2]) < 0.2, 'orbiteur : ' + u.tris + ' triangles, queue à y = ' + u.min[1] + ', nez à y = ' + u.max[1] + ', ventre à x = ' + u.min[0] + ', envergure ±' + u.max[2]);
  check(c.max[0] <= u.min[0] + 0.01 && u.max[1] < c.max[1], 'l\'orbiteur est à côté du réservoir (ne le traverse pas) et plus bas que son sommet');
  // lancement avec les vrais modèles : pièces et rendu des clones
  const res = vm.runInContext(`(() => {
    const O = FLIGHT_OBJECTS.shuttle, st = Object.assign({}, LAUNCH_SITES[0], { id: 'obj', name: O.name, lat: O.start.lat, lon: O.start.lon }), L = new Launch(st, 0, 0, 1, { opt: launchOptDefault(), object: O, models: M, az: Math.PI / 2 }), cam = { position: new THREE.Vector3(0, 0, 3) };
    let tri = 0, meshes = 0; L.group.traverse(o => { if (o.isMesh) { meshes++; tri += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; } });
    let bad = 0; for (let T = 0; T <= L.Tmax; T += 53) { L.T = T; L.playing = false; L.update(0.016, cam); if (![L.pos.x, L.pos.y, L.pos.z].every(Number.isFinite)) bad++; }
    L.T = 200; L.update(0.016, cam); const vis = [L.mBoost.map(m => m.visible).join(), L.mEpc.visible, L.mEsc.visible].join(' ');
    L.T = 600; L.update(0.016, cam); const vis2 = [L.mBoost.map(m => m.visible).join(), L.mEpc.visible, L.mEsc.visible].join(' ');
    return { meshes, tri: Math.round(tri), bad, pieces: L.pieces.map(p => p.tagKey + ':' + p.mesh.children.length).join(' '), vis, vis2 };
  })()`, sandbox);
  check(res.bad === 0 && res.tri > 200000, 'Launch avec les vrais modèles : ' + res.meshes + ' maillages, ' + res.tri + ' triangles dans la scène, débris (' + res.pieces + '), positions finies sur tout le vol');
  check(res.vis === 'false,false true true' && res.vis2 === 'false,false false true', 'visibilité attendue : T+200 boosters cachés / réservoir visible / orbiteur visible ; T+600 réservoir caché / orbiteur visible');
  if (fails.length) { console.log(fails.length + ' échec(s)'); process.exit(1); }
})();
