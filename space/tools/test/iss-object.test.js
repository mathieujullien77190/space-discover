// L'ISS décrite en JSON (data/objects/iss.json : paramètres orbitaux du TLE) doit suivre le même chemin que l'ISS réelle (SGP4, js/iss.js) : même plan, même phase, même trace au sol.
// Construit un vrai Launch (three.js, faux canvas) et compare sa position à issState(date) à plusieurs instants. node tools/test/iss-object.test.js
const fs = require('fs'), vm = require('vm'), path = require('path'), root = path.join(__dirname, '..', '..');
const ctx2d = new Proxy({}, { get: (t, k) => (k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
const sandbox = { console, Math, Date, JSON, Float32Array, Float64Array, Uint8Array, Uint16Array, Uint32Array, Int32Array, ArrayBuffer, Promise, setTimeout, performance: { now: () => Date.now() }, innerHeight: 900, innerWidth: 1400,
  document: { createElement: () => ({ width: 0, height: 0, getContext: () => ctx2d, style: {}, addEventListener() {} }), createElementNS: () => ({ style: {}, addEventListener() {}, setAttribute() {} }), getElementById: () => null } };
sandbox.window = sandbox; sandbox.self = sandbox; vm.createContext(sandbox);
for (const f of ['js/vendor/three.min.js', 'js/vendor/satellite.min.js', 'js/data/surface-earth.js', 'js/data/iss-data.js', 'js/earth.js', 'js/iss.js', 'js/physics.js', 'js/launch.js', 'js/rockets.js', 'js/story.js', 'js/flight-plan.js', 'js/flight-object.js', 'js/launch-3d.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox, { filename: f });
sandbox.ISS_OBJ = JSON.parse(fs.readFileSync(path.join(root, 'data/objects/iss.json'), 'utf8'));
const fails = [], res = vm.runInContext(`(() => {
  const out = [], date = new Date('2026-10-04T12:00:00Z'), s0 = objectStart(ISS_OBJ, { date }), cam = { position: new THREE.Vector3(0, 0, 3) };
  const site = Object.assign({}, LAUNCH_SITES[0], { id: 'obj', lat: s0.lat, lon: s0.lon });
  const L = new Launch(site, 0, 0, 1, { opt: launchOptDefault(), object: ISS_OBJ, date, az: s0.azimuthDeg * Math.PI / 180 });
  out.push({ txt: 'départ résolu : lat ' + s0.lat.toFixed(2) + '°, lon ' + s0.lon.toFixed(2) + '°, altitude ' + (s0.altitudeM / 1000).toFixed(1) + ' km, azimut ' + s0.azimuthDeg.toFixed(2) + '°, vitesse ' + s0.speedMs.toFixed(1) + ' m/s' });
  for (const T of [0, 600, 1800, 2790, 5579, 11158, 43200]) {
    L.T = T; L.playing = false; L.update(0.016, cam);
    const real = issState(new Date(date.getTime() + T * 1000)), a = L.pos.clone().normalize(), b = real.pos.clone().normalize();
    const ground = Math.acos(Math.max(-1, Math.min(1, a.dot(b)))) * R_KM, dh = (L.pos.length() - real.pos.length()) * R_KM;
    out.push({ T, ground, dh, txt: 'T+' + String(T).padStart(5) + ' s : écart au sol ' + ground.toFixed(1) + ' km, écart de hauteur ' + dh.toFixed(1) + ' km (JSON ' + ((L.pos.length() - 1) * R_KM).toFixed(1) + ' km, SGP4 ' + real.alt.toFixed(1) + ' km), lat/lon JSON ' + (Math.asin(a.y) / DEG).toFixed(2) + ' / ' + (Math.atan2(-a.z, a.x) / DEG).toFixed(2) + ', SGP4 ' + real.lat.toFixed(2) + ' / ' + real.lon.toFixed(2) });
  }
  return out;
})()`, sandbox);
for (const r of res) { console.log(r.txt); if (r.T != null && r.ground > 40) fails.push('T+' + r.T + ' : écart au sol ' + r.ground.toFixed(0) + ' km (> 40 km)'); }
// un TLE donne le même départ que les éléments écrits à la main
const viaTle = vm.runInContext(`(() => { const a = objectStart(ISS_OBJ, { date: new Date('2026-10-04T12:00:00Z') }), b = objectStart({ start: { tle: ISS_TLE, at: 'now' } }, { date: new Date('2026-10-04T12:00:00Z') }); return Math.hypot(a.lat - b.lat, a.lon - b.lon) + Math.abs(a.speedMs - b.speedMs) / 1000; })()`, sandbox);
console.log('TLE directement dans le JSON : écart avec les éléments saisis ' + viaTle.toExponential(1)); if (viaTle > 0.01) fails.push('start.tle différent de start.orbit');
if (fails.length) { console.log('ÉCHEC : ' + fails.join(' ; ')); process.exit(1); } else console.log('ok : l\'ISS JSON suit l\'ISS SGP4');
