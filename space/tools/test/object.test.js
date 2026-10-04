// Objet générique décrit par un JSON minimal (js/flight-object.js, data/objects/*.json) : doit atteindre l'orbite si les paliers sont bons, retomber sinon, et l'ISS reste en orbite.
// node tools/test/object.test.js
const fs = require('fs'), vm = require('vm'), path = require('path'), root = path.join(__dirname, '..', '..'), ctx = { console, Math, Date, JSON }; vm.createContext(ctx);
for (const f of ['js/physics.js', 'js/launch.js', 'js/flight-object.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const load = n => JSON.parse(fs.readFileSync(path.join(root, 'data/objects', n + '.json'), 'utf8')), fails = [], RE = 6378137;
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
r = fly(load('iss')); check(r.ok && Math.abs((r.orbit.rp - RE) / 1000 - 420) < 5 && Math.abs((r.orbit.ra - RE) / 1000 - 420) < 5, 'ISS décrite en JSON : orbite ' + orb(r));
// masse : un largage (baisse de massKg) et la consommation (isp) se voient dans les échantillons
r = fly(load('fusee-orbite-500km')); const m = t => r.samples.find(s => s.t >= t).m;
check(m(129) > 100000 && m(131) < 60000 && m(250) < m(135), 'masse : ' + Math.round(m(129)) + ' kg avant le largage, ' + Math.round(m(131)) + ' kg après, ' + Math.round(m(250)) + ' kg à T+250');
// entrées invalides
for (const [name, o] of [['sans start', { timeline: [{ t: 0, massKg: 1 }] }], ['sans timeline', { start: { lat: 0, lon: 0 } }], ['sans masse', { start: { lat: 0, lon: 0 }, timeline: [{ t: 0 }] }]]) { let e = null; try { fly(o); } catch (x) { e = x; } check(!!e, 'objet invalide (' + name + ') refusé : ' + (e && e.message)); }
if (fails.length) { console.log(fails.length + ' échec(s)'); process.exit(1); }
