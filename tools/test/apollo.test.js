// Mission Apollo 11 : construction de ApolloMission avec le vrai three.js (sans WebGL ni DOM : faux canvas) et lecture à différents instants.
// node tools/test/apollo.test.js
const fs = require('fs'), vm = require('vm'), path = require('path'), root = path.join(__dirname, '..', '..');
const ctx2d = new Proxy({}, { get: (t, k) => (k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
const sandbox = { console, Math, Date, JSON, Float32Array, Float64Array, Uint8Array, Uint16Array, Uint32Array, Int32Array, ArrayBuffer, Promise, setTimeout, performance: { now: () => Date.now() }, innerHeight: 900, innerWidth: 1400,
  document: { createElement: () => ({ width: 0, height: 0, getContext: () => ctx2d, style: {}, addEventListener() {} }), createElementNS: () => ({ style: {}, addEventListener() {}, setAttribute() {} }), getElementById: () => null } };
sandbox.window = sandbox; sandbox.self = sandbox; vm.createContext(sandbox);
const scripts = ['js/vendor/three.min.js', 'js/data/surface-earth.js', 'js/earth.js', 'js/physics.js', 'js/launch.js', 'js/rockets.js', 'js/story.js', 'js/story-apollo.js', 'js/data/surface-moon.js', 'js/data/apollo11.js', 'js/launch-3d.js', 'js/moon.js', 'js/apollo.js'];
for (const f of scripts) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox, { filename: f });
const out = vm.runInContext(`(() => {
  const res = [], t0 = Date.now(), m = new ApolloMission({}), A = m.A;
  res.push('construit en ' + (Date.now() - t0) + ' ms ; marqueurs ' + m.markers.length + ' ; étiquettes ' + m.tagList.length + ' ; Tmax ' + (m.Tmax / 3600).toFixed(1) + ' h');
  const cam = { position: new THREE.Vector3(0, 0, 3) }, bad = [];
  const check = (T, what) => {
    m.T = T; m.playing = false; m.update(0.016, cam);
    const f = m.focusPos, d = m.camDir; if (![f.x, f.y, f.z, d.x, d.y, d.z, m.camDistKm].every(Number.isFinite)) bad.push(what + ' : NaN');
    return f;
  };
  const ev = A.ev.slice(), rows = [];
  for (const e of [{ t: 0, key: 'T0', label: 'décollage' }, { t: 300, key: 'S-II', label: 'montée' }].concat(ev)) {
    for (const dt of [-30, 0, 30]) { const T = Math.max(0, e.t + dt); check(T, e.key + dt); }
    const f = check(e.t + 5, e.key), r = m.primRef;
    rows.push((e.t / 3600).toFixed(2).padStart(7) + ' h ' + e.key.padEnd(8) + ' prim ' + (m.prim || '-').padEnd(5) + ' cam ' + m.camDistKm.toFixed(2).padStart(9) + ' km  alt ' + (r ? Math.round(r.alt / 1000) : '-') + ' km  v ' + (r ? (r.speed / 1000).toFixed(2) : '-') + ' km/s  | ' + m.phase(e.t + 5));
  }
  res.push(rows.join('\\n'));
  // la Lune : distance Terre-Lune et orientation synchrone (la face visible regarde la Terre)
  check(100000, 'lune');
  const q = new THREE.Vector3(1, 0, 0).applyQuaternion(m.moonMesh.quaternion), toEarth = m.moonPos.clone().negate().normalize();
  res.push('Lune : distance ' + (m.moonPos.length() * 6378.137).toFixed(0) + ' km ; face visible vers la Terre : cos = ' + q.dot(toEarth).toFixed(4));
  // le site d'alunissage de la carte (lon 23,47° E) est bien sous le LEM posé
  check(A.ev.find(e => e.key === 'land').t + 600, 'sol');
  const lm = m.lmG.position.clone().sub(m.moonPos), site = m.siteV.clone().applyQuaternion(m.moonQ).multiplyScalar(MOON_R);
  res.push('LEM posé : écart au site de la carte ' + (lm.distanceTo(site) * 6378.137 * 1000).toFixed(0) + ' m (rayon lunaire ' + (lm.length() * 6378.137 - 1737.4).toFixed(2) + ' km au-dessus de la sphère)');
  res.push(bad.length ? 'PROBLÈMES : ' + bad.join(', ') : 'aucune valeur non finie');
  return res.join('\\n');
})()`, sandbox);
console.log(out);
// non-régression : un lancement ordinaire (Kourou, Ariane 5) fonctionne toujours (repère de la Terre, options d'élément)
console.log(vm.runInContext(`(() => { const L = new Launch(LAUNCH_SITES[0], 400, 9000, 1.4, {}); const cam = { position: new THREE.Vector3(0, 0, 3) }; L.T = 200; L.playing = false; L.update(0.016, cam); const o = L.elOpt('eap1'); return 'Launch ordinaire : inertial=' + L.inertial + ', alt ' + Math.round(L.altM / 1000) + ' km, trajectoire des boosters affichée : ' + o.traj + ', ' + L.pieces.length + ' débris'; })()`, sandbox));
// la Lune réelle : distance et déclinaison plausibles, rotation d'un tour en ~24 h dans le repère de la Terre
console.log(vm.runInContext(`(() => { const a = moonNow(new Date(Date.UTC(2026, 9, 2, 12))), b = moonNow(new Date(Date.UTC(2026, 9, 3, 12))), c = moonNow(new Date(Date.UTC(2026, 9, 2, 18))); const lon = v => Math.atan2(-v.z, v.x) / DEG, lat = v => Math.asin(v.y / v.length()) / DEG;
  return 'Lune réelle 2 oct. 2026 12 h UTC : ' + a.km.toFixed(0) + ' km, point sublunaire ' + lat(a.pos).toFixed(1) + '° / ' + lon(a.pos).toFixed(1) + '° ; 6 h plus tard ' + lon(c.pos).toFixed(1) + '° ; 24 h plus tard ' + lon(b.pos).toFixed(1) + '° (la Terre tourne dessous : ≈ −15° par heure + 0,55°)'; })()`, sandbox));
// le Soleil : 2 oct. 2026 → distance ≈ 0,999 UA, déclinaison ≈ −4°, et le Soleil tourne de 360° en un jour dans le repère de la Terre
console.log(vm.runInContext(`(() => { const D = astroD(new Date(Date.UTC(2026, 9, 2, 12))), s = sunGeo(D); const dec = Math.asin(s.y / s.length()) / DEG, au = s.length() / AU_U;
  const g = v => Math.atan2(-v.z, v.x) / DEG, e0 = s.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -gmstOf(D)), e1 = sunGeo(D + 0.25).applyAxisAngle(new THREE.Vector3(0, 1, 0), -gmstOf(D + 0.25));
  return 'Soleil 2 oct. 2026 12 h UTC : ' + au.toFixed(4) + ' UA, déclinaison ' + dec.toFixed(1) + '°, point subsolaire ' + g(e0).toFixed(1) + '° E ; 6 h plus tard ' + g(e1).toFixed(1) + '° (attendu ≈ −90°) ; rayon du Soleil ' + SUN_R_U.toFixed(1) + ' rayons terrestres'; })()`, sandbox));
// plan de vol : la section « jettison » du JSON pilote les débris (vitesse de séparation, désintégration, masse)
sandbox.PLAN_JSON = JSON.parse(fs.readFileSync(path.join(root, 'data/plans/kourou-ariane5-500km.json'), 'utf8'));
for (const f of ['js/flight-plan.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox, { filename: f });
console.log(vm.runInContext(`(() => {
  const mk = edit => { const p = JSON.parse(JSON.stringify(PLAN_JSON)); edit(p.jettison); const L = new Launch(Object.assign({}, LAUNCH_SITES[0], p.site), p.target.altitudeKm, p.vehicle.payloadKg, 1, { plan: p, rocketId: p.rocket, az: Math.PI / 2 }); const g = k => L.pieces.find(q => q.tagKey === k); return { eap: g('eap1'), epc: g('epc'), fa: g('fairA') }; };
  const base = mk(() => {}), fast = mk(j => { j.boosters.separationSpeedMs = -30; }), burn = mk(j => { j.boosters.disintegrates = true; j.boosters.disintegrationAltitudeKm = 30; j.stage1.disintegrates = false; });
  return 'JSON jettison : boosters tombent en ' + base.eap.path.length + ' s (' + base.eap.endText + '), avec séparation à −30 m/s : ' + fast.eap.path.length + ' s ; boosters désintégrés à 30 km : ' + burn.eap.path.length + ' s (' + burn.eap.endText + ') ; étage principal non désintégré : ' + burn.epc.path.length + ' s (' + burn.epc.endText + ')';
})()`, sandbox));
