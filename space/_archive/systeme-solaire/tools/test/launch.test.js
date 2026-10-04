// Lancement depuis Kourou : physique (orbite atteinte de 200 à 2 500 km, événements plausibles, conservation), lecture et dessin sans exception.
const ROOT = require('path').join(__dirname, '..', '..');
let s = require(ROOT + '/tools/load-page.js')();
const mkEl = () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {} }, append() {}, addEventListener() {}, querySelectorAll() { return []; }, setPointerCapture() {}, getContext() { return ctx; }, innerHTML: '', textContent: '' });
const ctx = new Proxy({}, { get: (t, k) => k === 'createRadialGradient' || k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : k in t ? t[k] : () => {}, set: (t, k, v) => { t[k] = v; return true; } });
globalThis.document = { getElementById: () => mkEl(), createElement: () => mkEl(), activeElement: null };
globalThis.innerWidth = 1200; globalThis.innerHeight = 800; globalThis.devicePixelRatio = 1; globalThis.addEventListener = () => {};
globalThis.requestAnimationFrame = () => {}; globalThis.Path2D = class { moveTo() {} lineTo() {} arc() {} closePath() {} rect() {} addPath() {} }; globalThis.performance = { now: () => 0 };
s = s.replace(/requestAnimationFrame\(loop\);\s*$/, '') + 'globalThis.T = { LCH, simulateLaunch, lchElements, launchSample, startLaunch, setLaunchView, showLaunchPanel, draw, focusOn, computePositions, SUN, EARTHB, get launch() { return launch; }, get launchView() { return launchView; }, infoEl };';
new Function(s)();
const T = globalThis.T, L = T.LCH, ok = (c, m) => console.log((c ? 'OK  ' : 'FAIL') + ' ' + m);
// orbites atteintes
let worst = 0, worstE = 0, allOk = true; const rows = [];
for (const tg of [200, 250, 300, 400, 550, 800, 1000, 1500, 2000, 2500]) { const r = T.simulateLaunch(tg), o = r.orbit; allOk = allOk && r.ok; const dp = (o.rp - L.RE) / 1000 - tg, da = (o.ra - L.RE) / 1000 - tg; worst = Math.max(worst, Math.abs(dp), Math.abs(da)); worstE = Math.max(worstE, o.e); rows.push(tg + ':' + dp.toFixed(1) + '/' + da.toFixed(1)); }
ok(allOk && worst < 15 && worstE < 0.002, 'orbites circulaires de 200 à 2 500 km : écart max au périgée/apogée ' + worst.toFixed(1) + ' km, e max ' + worstE.toFixed(4) + ' [' + rows.join(' ') + ']');
const bad = T.simulateLaunch(100); ok(!bad.ok, 'altitude trop basse (100 km) : orbite non atteinte (' + (bad.crashed ? 'la fusée retombe' : 'sans insertion') + '), sans exception');
// le lancement à 400 km en détail
const r = T.simulateLaunch(400), ev = k => r.events.find(e => e.key === k), o = r.orbit;
ok(Math.abs(o.T / 60 - 92.6) < 0.4, 'période à 400 km : ' + (o.T / 60).toFixed(1) + ' min'); ok(Math.abs(Math.hypot(r.state.vx, r.state.vy) - 7669) < 15, 'vitesse en orbite : ' + Math.hypot(r.state.vx, r.state.vy).toFixed(0) + ' m/s (circulaire à 400 km : 7 669)');
ok(['eap', 'fairing', 'meco', 'epcsep', 'esc1', 'esc1end', 'esc2', 'esc2end', 'sat'].every(k => ev(k)) && r.events.every((e, i, a) => i === 0 || e.t >= a[i - 1].t), 'les 9 événements sont là, dans l’ordre : ' + r.events.map(e => e.key).join(' → '));
ok(ev('eap').t > 125 && ev('eap').t < 140 && ev('eap').alt > 45e3 && ev('eap').alt < 80e3 && ev('eap').v > 1800 && ev('eap').v < 3200, 'séparation des boosters : T+' + ev('eap').t.toFixed(0) + ' s, ' + (ev('eap').alt / 1000).toFixed(0) + ' km, ' + ev('eap').v.toFixed(0) + ' m/s (réel ≈ 140 s, 68 km, 2 000 m/s)');
ok(r.maxQ.q > 20e3 && r.maxQ.q < 42e3 && r.maxQ.t > 50 && r.maxQ.t < 90, 'Max-Q : ' + (r.maxQ.q / 1000).toFixed(0) + ' kPa à T+' + r.maxQ.t.toFixed(0) + ' s (réel ≈ 35 kPa à 70 s)');
ok(ev('fairing').t === 200 || Math.abs(ev('fairing').t - 200) < 0.2, 'coiffe larguée à T+200 s'); ok(ev('meco').alt > 100e3 && ev('meco').v > 6500, 'arrêt du moteur principal : ' + (ev('meco').alt / 1000).toFixed(0) + ' km, ' + ev('meco').v.toFixed(0) + ' m/s');
const S = r.samples, g0 = S[0]; ok(g0.m > 740e3 && g0.m < 790e3, 'masse au décollage : ' + (g0.m / 1000).toFixed(0) + ' t (Ariane 5 ECA ≈ 780 t)');
ok(g0.acc > 1.5 && g0.acc < 2.2, 'accélération de poussée au décollage : ' + g0.acc.toFixed(2) + ' g'); let maxG = 0; for (const q of S) maxG = Math.max(maxG, q.acc); ok(maxG < 6 && maxG > 2.5, 'accélération maximale : ' + maxG.toFixed(1) + ' g (< 6 g)');
let mono = true; for (let i = 1; i < S.length; i++) if (S[i].m > S[i - 1].m + 1e-6) mono = false; ok(mono, 'la masse ne fait que baisser'); ok(r.propEscLeft > 5000, 'propergol restant dans l’étage supérieur : ' + (r.propEscLeft / 1000).toFixed(1) + ' t');
ok(JSON.stringify(T.simulateLaunch(400).events.map(e => e.t)) === JSON.stringify(r.events.map(e => e.t)), 'déterministe');
// lecture : échantillonnage continu autour de l'insertion
const tEnd = S[S.length - 1].t, a = T.launchSample(r, tEnd - 0.01), b = T.launchSample(r, tEnd + 0.01); ok(Math.hypot(a.x - b.x, a.y - b.y) < 3000 && Math.abs(a.alt - b.alt) < 3000, 'continuité à l’insertion (saut ' + Math.hypot(a.x - b.x, a.y - b.y).toFixed(0) + ' m)');
const o1 = T.launchSample(r, tEnd + o.T), o0 = T.launchSample(r, tEnd); ok(Math.hypot(o1.x - o0.x, o1.y - o0.y) < 5e3, 'après 1 période : de retour au même point (' + Math.hypot(o1.x - o0.x, o1.y - o0.y).toFixed(0) + ' m)');
// vue
T.computePositions(9400); T.focusOn(T.EARTHB); T.startLaunch(400); ok(T.launchView && T.launch && T.launch.sim.ok, 'startLaunch(400) : vue active');
let err = null; try { for (const tt of [0, 5, 9, 30, 70, 132, 140, 201, 300, 541, 560, 720, 1500, 2640, 2700, 3000, 3320, 3340, 3360, 3400, 3500, 5000, 20000]) { T.launch.t = tt; T.draw(1); T.draw(1.1); } T.showLaunchPanel(); } catch (e) { err = e; }
ok(!err, 'draw() à 23 instants de T+0 s à T+20 000 s, et fiche, sans exception' + (err ? ' : ' + err.stack : ''));
T.launch.t = 300; T.draw(1); ok(T.launch.debris.length >= 1, 'pièces larguées suivies (' + T.launch.debris.map(d => d.name).join(', ') + ')');
T.launch.t = 100; T.draw(1); ok(T.launch.debris.length === 0, 'on revient en arrière : les pièces disparaissent');
T.focusOn(T.SUN, 'overview'); ok(!T.launchView, 'Échap : quitte la vue du lancement');
T.startLaunch(100); let e2 = null; try { for (const tt of [0, 100, 600, 1000, 2000]) { T.launch.t = tt; T.draw(1); } } catch (e) { e2 = e; } ok(!e2 && !T.launch.sim.ok, 'cible inatteignable : dessin sans exception, avertissement');
