// Objet générique décrit par un JSON minimal (js/flight-object.js, objects/*/*.json) : doit atteindre l'orbite si les paliers sont bons, retomber sinon, et l'ISS reste en orbite.
// node tools/test/object.test.js
const fs = require('fs'), vm = require('vm'), path = require('path'), root = path.join(__dirname, '..', '..'), ctx = { console, Math, Date, JSON }; vm.createContext(ctx);
for (const f of ['js/physics.js', 'js/launch.js', 'js/flight-object.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
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
// entrées invalides
for (const [name, o] of [['sans start', { timeline: [{ t: 0, massKg: 1 }] }], ['sans timeline', { start: { lat: 0, lon: 0 } }], ['sans masse', { start: { lat: 0, lon: 0 }, timeline: [{ t: 0 }] }]]) { let e = null; try { fly(o); } catch (x) { e = x; } check(!!e, 'objet invalide (' + name + ') refusé : ' + (e && e.message)); }
if (fails.length) { console.log(fails.length + ' échec(s)'); process.exit(1); }
