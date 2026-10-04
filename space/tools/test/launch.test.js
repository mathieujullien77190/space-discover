// Lancement 3D (Launch), Lune et Soleil réels, section « jettison » du plan JSON, Starship et son booster : construits avec le vrai three.js (sans WebGL ni DOM : faux canvas).
// node tools/test/launch.test.js
const fs = require('fs'), vm = require('vm'), path = require('path'), root = path.join(__dirname, '..', '..');
const ctx2d = new Proxy({}, { get: (t, k) => (k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
const sandbox = { console, Math, Date, JSON, Float32Array, Float64Array, Uint8Array, Uint16Array, Uint32Array, Int32Array, ArrayBuffer, Promise, setTimeout, performance: { now: () => Date.now() }, innerHeight: 900, innerWidth: 1400,
  document: { createElement: () => ({ width: 0, height: 0, getContext: () => ctx2d, style: {}, addEventListener() {} }), createElementNS: () => ({ style: {}, addEventListener() {}, setAttribute() {} }), getElementById: () => null } };
sandbox.window = sandbox; sandbox.self = sandbox; vm.createContext(sandbox);
const scripts = ['js/vendor/three.min.js', 'js/data/surface-earth.js', 'js/earth.js', 'js/physics.js', 'js/launch.js', 'js/rockets.js', 'js/story.js', 'js/data/surface-moon.js', 'js/flight-object.js', 'js/data/objects.js', 'js/launch-3d.js', 'js/moon.js'];
for (const f of scripts) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox, { filename: f });
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
// Starship : plan JSON complet (visuel compris) + booster qui revient se poser sur la tour
for (const f of ['js/data/plans.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox, { filename: f });
console.log(vm.runInContext(`(() => {
  const P = FLIGHT_PLANS.starship500, site = Object.assign({}, LAUNCH_SITES[0], { id: 'plan', name: P.site.name, lat: P.site.lat, lon: P.site.lon });
  const L = new Launch(site, P.target.altitudeKm, P.vehicle.payloadKg, 1, { plan: P, az: Math.PI / 2 }), cam = { position: new THREE.Vector3(0, 0, 3) };
  const p = L.pieces.find(q => q.tagKey === 'epc'), o = [];
  o.push('Starship : ' + L.rocketSpec.name + ', tour ' + !!L.tower + ', orbite ' + Math.round((L.sim.orbit.rp - 6378137) / 1000) + ' x ' + Math.round((L.sim.orbit.ra - 6378137) / 1000) + ' km, ok ' + L.sim.ok);
  o.push('booster : ' + p.endText + ', vol ' + p.path.length + ' s, écart ' + L.retResult.touchdown.missM.toFixed(1) + ' m, vitesse relative ' + L.retResult.touchdown.speedMs.toFixed(1) + ' m/s ; événements du retour : ' + L.extraEvents.map(e => e.key + '@' + e.t.toFixed(0)).join(' '));
  let flames = 0, steps = 0; for (let T = L.ev.epcsep.t; T < L.ev.epcsep.t + p.path.length + 5; T += 2) { L.T = T; L.playing = false; L.update(0.016, cam); steps++; if (p.ret.flame.visible) flames++; }
  o.push('flamme visible ' + flames + ' / ' + steps + ' images ; suivi du booster : ' + (L.follow = 'epc', L.update(0.016, cam), Number.isFinite(L.focusPos.x) && L.focusPos.length() > 0.9));
  return o.join(String.fromCharCode(10));
})()`, sandbox));

// Ariane 5 en objet JSON (objects/ariane5/ : ariane5.json + une pièce larguable par fichier) : orbite, pièces qui se détachent et retombent chacune avec ses propres paramètres
console.log(vm.runInContext(`(() => {
  const O = FLIGHT_OBJECTS.ariane5, site = Object.assign({}, LAUNCH_SITES[0], { id: 'obj', name: O.name, lat: O.start.lat, lon: O.start.lon }), cam = { position: new THREE.Vector3(0, 0, 3) };
  const L = new Launch(site, 0, 0, 1, { opt: launchOptDefault(), object: O, az: Math.PI / 2 }), o = L.sim.orbit, N = String.fromCharCode(10), g = k => L.pieces.filter(q => q.key === k);
  const out = ['Ariane 5 objet : orbite ' + Math.round((o.rp - 6378137) / 1000) + ' x ' + Math.round((o.ra - 6378137) / 1000) + ' km, ok ' + L.sim.ok + ', ' + L.sim.events.map(e => e.key).join(' ')];
  out.push('pièces : ' + L.pieces.map(q => q.tagKey + ' (' + q.model.dry + ' kg, ' + q.path.length + ' s, ' + q.endText + ')').join(' ; '));
  out.push('étiquettes : ' + L.tagList.map(t => t.id).join(' '));
  let bad = 0; for (let T = 0; T <= L.Tmax; T += 97) { L.T = T; L.playing = false; L.update(0.016, cam); if (![L.pos.x, L.pos.y, L.pos.z].every(Number.isFinite)) bad++; }
  out.push('lecture : ' + (bad ? bad + ' positions non finies' : 'positions finies, tout le vol') + ' ; boosters ' + g('eap').length + ', coiffe ' + g('fairing').length + ', étage principal ' + g('epcsep').length);
  return out.join(N);
})()`, sandbox));
