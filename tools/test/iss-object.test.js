// L'ISS de la scène est UNE SEULE : celle du JSON (objects/iss/iss.json, dossier = JSON + modèle 3D). issState(date) (js/iss.js) doit donner pile la position SGP4 du TLE d'origine, et le dossier doit contenir le modèle.
// node tools/test/iss-object.test.js   (ISS_DATE=2026-10-12T03:00:00Z pour une autre date)
const fs = require('fs'), vm = require('vm'), path = require('path'), root = path.join(__dirname, '..', '..');
const sandbox = { console, Math, Date, JSON, Float32Array, Float64Array, Uint8Array, Uint16Array, Uint32Array, Int32Array, ArrayBuffer, Promise, setTimeout, document: { createElement: () => ({ getContext: () => ({}), style: {} }) }, innerHeight: 900, innerWidth: 1400 };
sandbox.window = sandbox; sandbox.self = sandbox; vm.createContext(sandbox);
for (const f of ['js/vendor/three.min.js', 'js/vendor/satellite.min.js', 'js/data/objects.js', 'js/ephemeris.js', 'js/bodies.js', 'js/earth.js', 'js/physics.js', 'js/launch.js', 'js/flight-object.js', 'js/iss.js']) { try { vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox, { filename: f }); } catch (e) { if (f !== 'js/earth.js') throw e; } }
// TLE d'origine de l'ISS (CelesTrak, 2026-10-01) : la vérité pour la comparaison
sandbox.TLE = ["1 25544U 98067A   26274.49758378  .00003723  00000+0  76468-4 0  9991", "2 25544  51.6318 133.9648 0006934 209.9872 150.0720 15.48703850588231"];
sandbox.ISS_DATE = process.env.ISS_DATE || '2026-10-04T12:00:00Z';
const fails = [], check = (c, msg) => { console.log((c ? 'ok   ' : 'ÉCHEC ') + msg); if (!c) fails.push(msg); };
const folder = path.join(root, 'objects', 'iss'), json = JSON.parse(fs.readFileSync(path.join(folder, 'iss.json'), 'utf8'));
check(json.live === true && !!json.model && fs.existsSync(path.join(folder, json.model.file)), 'dossier objects/iss : iss.json (live) + modèle ' + json.model.file + ' (' + (fs.statSync(path.join(folder, json.model.file)).size / 1e6).toFixed(1) + ' Mo)');
const G = e => vm.runInContext(e, sandbox);
check(G('ISS_MODEL') === 'objects/iss/' + json.model.file && G('ISS_W') === json.visual.widthM, 'js/iss.js lit le modèle (' + G('ISS_MODEL') + ') et la largeur (' + G('ISS_W') + ' m) dans le JSON');
const res = vm.runInContext(`(() => {
  const rec = satellite.twoline2satrec(TLE[0], TLE[1]), base = new Date(ISS_DATE), out = [];
  for (const T of [0, 600, 1800, 2790, 5579, 43200, 86400 * 3]) {
    const d = new Date(base.getTime() + T * 1000), s = issState(d), pv = satellite.propagate(rec, d), gm = satellite.gstime(d), ecf = satellite.eciToEcf(pv.position, gm), geo = satellite.eciToGeodetic(pv.position, gm);
    const truth = new THREE.Vector3(ecf.x, ecf.z, -ecf.y), g = Math.acos(Math.max(-1, Math.min(1, s.pos.clone().normalize().dot(truth.clone().normalize())))) * R_KM, dr = (s.pos.length() - truth.length() / R_KM) * R_KM;
    out.push({ T, ground: g, dr, dalt: s.alt - geo.height, txt: 'T+' + String(T).padStart(6) + ' s : écart au sol ' + g.toFixed(2) + ' km, de rayon ' + dr.toFixed(2) + ' km, de hauteur géodésique ' + (s.alt - geo.height).toFixed(2) + ' km (' + s.alt.toFixed(1) + ' km, ' + s.speed.toFixed(2) + ' km/s)' });
  }
  return out;
})()`, sandbox);
for (const r of res) { console.log(r.txt); if (r.ground > 1 || Math.abs(r.dr) > 1 || Math.abs(r.dalt) > 0.5) fails.push('T+' + r.T + ' : écart ' + r.ground.toFixed(2) + ' km au sol, ' + r.dr.toFixed(2) + ' km de rayon, ' + r.dalt.toFixed(2) + ' km de hauteur'); }
const far = vm.runInContext('issState(new Date(Date.parse("2027-01-01T00:00:00Z")))', sandbox); check(far === null, 'au-delà de ±60 jours de l’époque : pas d’ISS (comme avant)');
const dir = vm.runInContext(`(() => { const s = issState(new Date(ISS_DATE)); return Math.abs(s.vel.dot(s.up)) < 0.15 && Math.abs(s.vel.length() - 1) < 1e-6; })()`, sandbox); check(dir, 'direction de vol : unitaire et presque horizontale');
console.log('période affichée : ' + (G('ISS_PERIOD_MS') / 60000).toFixed(2) + ' min');
if (fails.length) { console.log('ÉCHEC : ' + fails.join(' ; ')); process.exit(1); } else console.log('ok : l’ISS de la scène (JSON) suit SGP4 à moins de 1 km');
