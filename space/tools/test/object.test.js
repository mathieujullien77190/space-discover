// Objet générique décrit par un JSON minimal (js/flight-object.js, objects/*/*.json) : doit atteindre l'orbite si les paliers sont bons, retomber sinon, et l'ISS reste en orbite.
// node tools/test/object.test.js
const fs = require('fs'), vm = require('vm'), path = require('path'), root = path.join(__dirname, '..', '..'), ctx = { console, Math, Date, JSON }; vm.createContext(ctx);
for (const f of ['js/physics.js', 'js/launch.js', 'js/data/objects.js', 'js/ephemeris.js', 'js/bodies.js', 'js/flight-object.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const load = n => JSON.parse(fs.readFileSync(path.join(root, 'objects', n, n + '.json'), 'utf8')), fails = [], RE = 6378137;
const check = (c, msg) => { console.log((c ? 'ok   ' : 'ÉCHEC ') + msg); if (!c) fails.push(msg); };
const fly = o => ctx.flyObject(JSON.parse(JSON.stringify(o)));
const orb = r => ((r.orbit.rp - RE) / 1000).toFixed(0) + ' × ' + ((r.orbit.ra - RE) / 1000).toFixed(0) + ' km';
let r = fly(load('fusee-orbite-500km'));
check(r.ok && !r.crashed && Math.abs((r.orbit.rp - RE) / 1000 - 500) < 60 && Math.abs((r.orbit.ra - RE) / 1000 - 500) < 60, 'fusée avec les bons paliers : orbite ' + orb(r) + ' (' + r.events.map(e => e.key + '@' + e.t.toFixed(0)).join(' ') + ')');
r = fly(load('fusee-trop-lente'));
check(!r.ok && r.crashed && r.events.some(e => e.key === 'crash'), 'même fusée, moteur coupé à T+200 : ' + r.message);
// la vitesse est le seul paramètre qui change : un palier « speedMs » trop faible la fait retomber, le bon la garde en orbite
const orbital = load('fusee-orbite-500km'); orbital.timeline.push({ t: 908, speedMs: 7000, label: 'vitesse remise à 7000 m/s' });
r = fly(orbital); check(!r.ok && r.crashed, 'palier « speedMs » à 7000 m/s après l’orbite : retombe (' + r.message + ')');
r = fly(load('iss')); check(r.ok && (r.orbit.rp - RE) / 1000 > 405 && (r.orbit.ra - RE) / 1000 < 440, 'ISS décrite en JSON (paramètres orbitaux réels) : reste en orbite basse ' + orb(r));
// masse : un largage (baisse de massKg) et la consommation (isp) se voient dans les échantillons
r = fly(load('fusee-orbite-500km')); const m = t => r.samples.find(s => s.t >= t).m;
check(m(129) > 100000 && m(131) < 60000 && m(250) < m(135), 'masse : ' + Math.round(m(129)) + ' kg avant le largage, ' + Math.round(m(131)) + ' kg après, ' + Math.round(m(250)) + ' kg à T+250');
// Ariane 5 : objet JSON + pièces larguables (un JSON par pièce, dans le même dossier)
const loadFull = n => { const o = load(n); for (const [k, f] of Object.entries(o.parts || {})) if (typeof f === 'string') o.parts[k] = JSON.parse(fs.readFileSync(path.join(root, 'objects', n, f), 'utf8')); return o; };
const A = loadFull('ariane5'); r = fly(A);
check(r.ok && Math.abs((r.orbit.rp - RE) / 1000 - 500) < 15 && Math.abs((r.orbit.ra - RE) / 1000 - 500) < 15, 'Ariane 5 (objet JSON) : orbite ' + orb(r) + ', ' + A.timeline.length + ' paliers, ' + Object.keys(A.parts).length + ' pièces');
const ms = t => r.samples.find(s => s.t >= t).m, ev = k => r.events.find(e => e.key === k);
check(ev('eap') && ev('fairing') && ev('epcsep') && ev('sat') && Object.keys(r.plan.jettison).join() === 'boosters,fairing,stage1,payload', 'largages : ' + ['eap', 'fairing', 'epcsep', 'sat'].map(k => k + '@' + ev(k).t.toFixed(0)).join(' ') + ' → jettison ' + Object.keys(r.plan.jettison).join(', '));
check(ms(129) - ms(131) > 60000 && ms(131) - ms(131.5) < 500, 'masse : −' + Math.round(ms(129) - ms(131)) + ' kg quand les 2 boosters (2 × 33 t) partent, puis consommation normale');
const slow = JSON.parse(JSON.stringify(A)); slow.timeline.find(e => e.key === 'esc2end').t = 3262; slow.timeline.find(e => e.release && e.release[0].part === 'satellite').t = 3262.1; r = fly(slow);
check(!r.ok || (r.orbit.rp - RE) / 1000 < 450, 'même fusée, 2e poussée écourtée : ' + (r.ok ? 'orbite basse ' + orb(r) : r.message));
const noPart = JSON.parse(JSON.stringify(A)); delete noPart.parts.booster; let ep = null; try { fly(noPart); } catch (x) { ep = x; } check(!!ep, 'pièce absente refusée : ' + (ep && ep.message));
// Navette spatiale : orbite basse, 2 SRB puis réservoir externe larguables, pas de coiffe ni de satellite
const SH = loadFull('shuttle'); r = fly(SH);
check(r.ok && (r.orbit.rp - RE) / 1000 > 190 && (r.orbit.ra - RE) / 1000 < 260, 'Navette (objet JSON) : orbite ' + orb(r) + ', ' + SH.timeline.length + ' paliers, ' + Object.keys(SH.parts).length + ' pièces, ' + r.events.map(e => e.key + '@' + e.t.toFixed(0)).join(' '));
check(!r.events.some(e => e.key === 'fairing' || e.key === 'sat') && Object.keys(r.plan.jettison).join() === 'boosters,stage1', 'largages : boosters (' + r.plan.jettison.boosters.count + ' × ' + r.plan.jettison.boosters.dryKg + ' kg) puis réservoir (' + r.plan.jettison.stage1.dryKg + ' kg + ' + r.plan.jettison.stage1.residualPropKg + ' kg de reste), disintegrates ' + r.plan.jettison.stage1.disintegrates);
let gm = 0; for (const s of r.samples) gm = Math.max(gm, s.acc); const m1 = t => r.samples.find(s => s.t >= t).m;
check(gm < 3.05 && gm > 2.5 && m1(0) > 2.0e6 && m1(0) < 2.1e6, 'accélération max ' + gm.toFixed(2) + ' g (limite des 3 g), masse au décollage ' + Math.round(m1(0)) + ' kg, poussée/poids au départ ' + (r.samples[1].F / (r.samples[1].m * 9.80665)).toFixed(2));
const early = JSON.parse(JSON.stringify(SH)); early.timeline.find(e => e.key === 'esc2end').t = 1380; early.timeline.find(e => e.key === 'esc2').t = 1361; r = fly(early);
check(!r.ok || (r.orbit.rp - RE) / 1000 < 150, 'même navette, circularisation écourtée à 19 s : ' + (r.ok ? 'orbite ' + orb(r) : r.message));
// trajectoire de libération : l objet quitte la Terre (vol suivi jusque vers 10⁹ m, échantillons espacés), poussée « prograde »
{ const MU = 3.986004418e14, esc = { name: 'sonde', maxDurationS: 300000, start: { lat: 0, lon: 0, altitudeKm: 300, azimuthDeg: 90, elevationDeg: 0, speedMs: 12000, frame: 'inertial' }, timeline: [{ t: 0, massKg: 1000, cdA: 0, label: 'Sonde' }] };
  r = fly(esc); const want = Math.sqrt(144e6 - 2 * MU / (RE + 300e3)) / 1000, last = r.samples[r.samples.length - 1];
  check(r.ok && r.hyperbolic && r.reason === 'escape' && Math.abs(r.vInf / 1000 - want) < 0.05 && Math.hypot(last.x, last.y) > 0.99e9 && r.samples.length < 20000, 'libération à 12 km/s depuis 300 km : v∞ ' + (r.vInf / 1000).toFixed(2) + ' km/s (attendu ' + want.toFixed(2) + '), ' + r.samples.length + ' échantillons, jusque vers ' + Math.round(Math.hypot(last.x, last.y) / 1e6) + ' 000 km — ' + r.message);
  const burn = { name: 'sonde', maxDurationS: 300000, start: { lat: 0, lon: 0, altitudeKm: 300, azimuthDeg: 90, elevationDeg: 0, speedMs: 7730, frame: 'inertial' }, timeline: [{ t: 0, massKg: 1000, accelMs2: 5, pitch: 'prograde', label: 'Poussée le long de la vitesse', cdA: 0 }, { t: 900, accelMs2: 0, label: 'Fin de poussée' }] };
  r = fly(burn); check(r.ok && r.hyperbolic && r.c3 > 0, 'poussée « prograde » de 900 s (5 m/s²) depuis une orbite basse : ' + r.message);
  const short = JSON.parse(JSON.stringify(burn)); short.timeline[1].t = 300; r = fly(short); check(r.ok && !r.hyperbolic && r.orbit.e < 1, 'même poussée écourtée à 300 s : reste liée à la Terre (orbite ' + orb(r) + ', e = ' + r.orbit.e.toFixed(2) + ')'); }
// Voyager : Titan IIIE-Centaur, trajectoire de libération (C3 ≈ 102 km²/s²), 6 pièces dont 3 « masse seule » (étages Titan 2, Centaur) ; la Lune et le Soleil l'attirent
{ const V = loadFull('voyager'); r = fly(V); const ms = tt => r.samples.find(s => s.t >= tt).m, ev = k => r.events.find(e => e.key === k), cent = V.parts.centaur.residualPropKg;
  check(r.ok && r.hyperbolic && r.c3 / 1e6 > 98 && r.c3 / 1e6 < 106, 'Voyager (objet JSON) : ' + r.message + ' · ' + V.timeline.length + ' paliers, ' + Object.keys(V.parts).length + ' pièces');
  check(Math.abs(ms(470) - 18395) < 30 && Math.abs(r.samples[r.samples.length - 1].m - 60) < 15, 'bilan de masse : ' + Math.round(ms(470)) + ' kg au 2e allumage du Centaur (attendu 18 395) et ' + Math.round(r.samples[r.samples.length - 1].m) + ' kg à la fin (boîtier du Star-37E, attendu ≈ 60) ; ergols du Centaur restants ' + cent + ' kg');
  check(cent >= 0 && cent < 400 && ev('eap') && ev('fairing') && ev('epcsep') && ev('sat') && ev('esc1') && ev('esc2') && Object.keys(r.plan.jettison).join() === 'boosters,fairing,stage1,payload', 'événements : ' + r.events.map(e => e.key + '@' + e.t.toFixed(0)).join(' ').slice(0, 170));
  let gm = 0; for (const s of r.samples) if (s.t < 2000) gm = Math.max(gm, s.acc); check(r.samples[1].F / (r.samples[1].m * 9.80665) > 1.3 && gm < 5, 'poussée/poids au départ ' + (r.samples[1].F / (r.samples[1].m * 9.80665)).toFixed(2) + ', accélération max avant le Centaur ' + gm.toFixed(2) + ' g');
  const date = new Date('2026-10-04T12:00:00Z'), d3 = ctx.flyObject(JSON.parse(JSON.stringify(V)), { date }), dd = Math.hypot(d3.state.x - r.state.x, d3.state.y - r.state.y) / 1000;
  check(d3.thirdBodies && d3.hyperbolic && dd > 5 && dd < 2000, 'avec la Lune et le Soleil : trajectoire déviée de ' + dd.toFixed(0) + ' km à 10⁶ km de la Terre (v∞ ' + (d3.vInf / 1000).toFixed(3) + ' contre ' + (r.vInf / 1000).toFixed(3) + ' km/s)');
  const weak = JSON.parse(JSON.stringify(V)); weak.timeline.find(e => e.key === 'esc2end').t -= 120; weak.timeline.find(e => e.t > 2849 && e.t < 2850).t -= 120; r = fly(weak); check(!r.hyperbolic, 'même lanceur, injection du Centaur écourtée de 2 min : ne quitte pas la Terre (' + r.message + ')'); }
// attraction de la Lune et du Soleil (effet de marée), seulement si la date du départ est connue
{ const date = new Date('2026-10-04T12:00:00Z'), tb = ctx.ephThirdBody(5.24, -52.77, 90, date), mag = (r, v) => Math.hypot(...tb(0, r, 0)), RE0 = 6378137;
  const c0 = Math.hypot(...tb(0, 0, 0)), leo = mag(RE0 + 400e3), far = mag(60 * RE0), lun = mag(380e6);
  check(c0 < 1e-12 && leo > 1e-7 && leo < 2e-6 && far > leo * 20 && lun > leo * 20, 'marée Lune + Soleil : nulle au centre de la Terre (' + c0.toExponential(1) + '), ' + leo.toExponential(2) + ' m/s² à 400 km, ' + far.toExponential(2) + ' à 60 rayons, ' + lun.toExponential(2) + ' à la distance de la Lune');
  const base = fly(A), withB = ctx.flyObject(JSON.parse(JSON.stringify(A)), { date }), off = JSON.parse(JSON.stringify(A)); off.thirdBodies = false; const withoutB = ctx.flyObject(off, { date });
  const d = (u, v) => Math.hypot(u.state.x - v.state.x, u.state.y - v.state.y) / 1000;
  check(withB.thirdBodies && !withoutB.thirdBodies && !base.thirdBodies, 'Ariane 5 : attraction prise en compte avec une date (' + withB.thirdBodies + '), sans date (' + base.thirdBodies + '), désactivée par thirdBodies:false (' + withoutB.thirdBodies + ')');
  check(d(withB, base) > 0.001 && d(withB, base) < 20 && d(withoutB, base) < 1e-9, 'effet sur la position finale : ' + d(withB, base).toFixed(3) + ' km (orbite ' + orb(withB) + ' au lieu de ' + orb(base) + '), 0 km avec thirdBodies:false'); }
// entrées invalides
for (const [name, o] of [['sans start', { timeline: [{ t: 0, massKg: 1 }] }], ['sans timeline', { start: { lat: 0, lon: 0 } }], ['sans masse', { start: { lat: 0, lon: 0 }, timeline: [{ t: 0 }] }]]) { let e = null; try { fly(o); } catch (x) { e = x; } check(!!e, 'objet invalide (' + name + ') refusé : ' + (e && e.message)); }
if (fails.length) { console.log(fails.length + ' échec(s)'); process.exit(1); }
