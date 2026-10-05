// Vue de suivi de l'ISS : textes (distance, vitesses, taille), géométrie à l'échelle (200 km entre les deux trajectoires), pointillés, sortie.
const ROOT = require('path').join(__dirname, '..', '..');
let s = require(ROOT + '/tools/load-page.js')();
const mkEl = () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {} }, append() {}, addEventListener() {}, querySelectorAll() { return []; }, setPointerCapture() {}, getContext() { return ctx; }, innerHTML: '' });
const rec = { text: [], arcs: [], dashes: [], images: 0 };
const ctx = new Proxy({}, { get: (t, k) => k === 'createRadialGradient' || k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : k === 'fillText' ? (x, y, ...r) => rec.text.push(x) : k === 'arc' ? (...a) => rec.arcs.push(a) : k === 'setLineDash' ? a => rec.dashes.push(a.length) : k === 'drawImage' ? () => { rec.images++; } : k in t ? t[k] : () => {}, set: (t, k, v) => { t[k] = v; return true; } });
globalThis.document = { getElementById: () => mkEl(), createElement: () => mkEl(), activeElement: null };
globalThis.Image = class { constructor() { this.complete = true; this.naturalWidth = 1200; } set src(v) { this._src = v; } get src() { return this._src; } };
globalThis.innerWidth = 1200; globalThis.innerHeight = 800; globalThis.devicePixelRatio = 1; globalThis.addEventListener = () => {};
globalThis.requestAnimationFrame = () => {}; globalThis.Path2D = class { moveTo() {} lineTo() {} arc() {} closePath() {} rect() {} addPath() {} }; globalThis.performance = { now: () => 0 };
s = s.replace(/requestAnimationFrame\(loop\);\s*$/, '') + 'globalThis.T = { ISS, draw, computePositions, focusOn, setIssFollow, issFollowLayout, showInfo, SUN, get issFollow() { return issFollow; }, get run() { return issFollowRun; }, get speed() { return speed; }, get playing() { return playing; }, get ISS_FOLLOW_SPEED() { return ISS_FOLLOW_SPEED; }, set simT(v) { simT = v; }, set playing(v) { playing = v; }, set speed(v) { speed = v; }, get hits() { return hits; } };';
new Function(s)();
const T = globalThis.T, I = T.ISS, ok = (c, m) => console.log((c ? 'OK  ' : 'FAIL') + ' ' + m);
const t0 = I.epoch + 0.3; T.simT = t0; T.computePositions(t0); T.focusOn(I);
ok(!T.issFollow, 'vue de suivi inactive par défaut');
T.setIssFollow(true); ok(T.issFollow, 'vue de suivi activée (bouton de la fiche)');
rec.text.length = 0; rec.arcs.length = 0; rec.dashes.length = 0; rec.images = 0; T.draw(1);
const txt = rec.text.join(' | ');
for (const [needle, what] of [['200 km', 'distance 200 km'], ['109 m', 'envergure 109 m'], ['73 m', 'longueur 73 m'], ['7,6', 'vitesse de l’ISS 7,6x km/s'], ['7,7', 'vitesse de l’observateur 7,7x km/s'], ['km/h', 'vitesse en km/h'], ['420 t', 'masse'], ['Au-dessus de', 'point survolé'], ['dessinée ×', 'facteur d’agrandissement'], ['trajectoire de l’ISS (400 km)', 'légende ISS'], ['trajectoire de l’observateur (200 km)', 'légende observateur']]) ok(txt.includes(needle), what + ' affichée(e)');
ok(rec.images >= 1, 'modèle SVG de l’ISS dessiné dans la vue de suivi');
ok(rec.dashes.some(n => n > 0), 'traits en pointillé utilisés (' + rec.dashes.filter(n => n > 0).length + ' fois)');
// géométrie : deux cercles de trajectoire concentriques dont les rayons diffèrent de 200 km à l'échelle
const L = T.issFollowLayout(), big = rec.arcs.filter(a => a[2] > 1000).map(a => a[2]).sort((a, b) => a - b);
const rObs = (6378.137 + 200) * L.sc, rIss = (6378.137 + 400) * L.sc;
ok(big.some(r => Math.abs(r - rObs) < 1e-6) && big.some(r => Math.abs(r - rIss) < 1e-6), 'rayons des trajectoires : observateur ' + rObs.toFixed(0) + ' px, ISS ' + rIss.toFixed(0) + ' px');
ok(Math.abs((rIss - rObs) - 200 * L.sc) < 1e-6 && Math.abs((L.oy - L.iy) - 200 * L.sc) < 1e-6, 'écart vertical observateur–ISS = 200 km à l’échelle (' + (200 * L.sc).toFixed(0) + ' px)');
ok(Math.abs(L.ec - L.oy - rObs) < 1e-6, 'le centre de la Terre est bien à (rayon + 200 km) sous l’observateur');
// pendant la vue de suivi : plus de scène, aucun astre cliquable ; hors période : message ; sortie par focusOn (Échap)
ok(T.hits.length === 0, 'aucun élément cliquable de la scène normale');
T.simT = I.epoch + 90; rec.text.length = 0; T.draw(1); ok(rec.text.join('|').includes('hors de la période'), 'hors période (+ 90 j) : message « ISS hors de la période couverte »');
T.simT = t0; T.focusOn(T.SUN, 'overview'); ok(!T.issFollow, 'Échap / changement de focus : sortie de la vue de suivi');
T.focusOn(I); T.setIssFollow(true); T.playing = true; T.speed = 365; rec.text.length = 0; T.draw(1); ok(true, 'vitesse de simulation élevée : dessin sans erreur (défilement figé)');

// ===== ça tourne : défilement du sol, plaques, mini-carte de l'orbite, vitesse d'entrée =====
{ T.focusOn(T.SUN, 'overview'); T.playing = true; T.speed = 1 / 86400; T.simT = t0; T.computePositions(t0); T.focusOn(I);
  T.setIssFollow(true); ok(Math.abs(T.speed - T.ISS_FOLLOW_SPEED) < 1e-12 && T.playing, 'entrée dans la vue : temps réel par défaut (×' + Math.round(T.speed * 86400) + ')');
  // le sol défile : on avance de 1 s réelle et de 1 s simulée par image de 1/60 s
  let tt = 10, sim = t0; T.simT = sim; T.draw(tt); const r0 = T.run;
  for (let i = 0; i < 60; i++) { tt += 1 / 60; sim += (1 / 60) * T.ISS_FOLLOW_SPEED; T.simT = sim; T.draw(tt); }
  const dr = T.run - r0; ok(Math.abs(T.speed * 86400 - 1) < 1e-9 && Math.abs(dr - 7.2) < 0.6, 'après 1 s réelle en temps réel : le sol a défilé de ' + dr.toFixed(1) + ' km (≈ 7,2 km/s)');
  // en temps réel il défile à la vitesse réelle (≈ 7,2 km/s)
  T.speed = 1 / 86400; const r1 = T.run; for (let i = 0; i < 60; i++) { tt += 1 / 60; sim += (1 / 60) * (1 / 86400); T.simT = sim; T.draw(tt); }
  ok(Math.abs((T.run - r1) - 7.2) < 0.6, 'en temps réel : défilement de ' + (T.run - r1).toFixed(2) + ' km en 1 s (≈ 7,2 km/s, vitesse au sol de l’ISS)');
  // en pause : rien ne bouge
  T.playing = false; const r2 = T.run; for (let i = 0; i < 30; i++) { tt += 1 / 60; T.draw(tt); } ok(T.run === r2, 'en pause : le sol ne bouge plus'); T.playing = true;
  // temps très accéléré (1 an/s) : défilement plafonné, donc fluide
  T.speed = 365.256; const r3 = T.run; for (let i = 0; i < 60; i++) { tt += 1 / 60; sim += (1 / 60) * 365.256; T.simT = sim; T.draw(tt); }
  ok(Math.abs(T.run - r3) <= 200.5 && Math.abs(T.run - r3) > 100, 'à 1 an/s : défilement plafonné à ' + (T.run - r3).toFixed(0) + ' km par seconde réelle (pas de scintillement)');
  // remonter le temps : le sol défile dans l'autre sens
  T.speed = -365.256; const r4 = T.run; for (let i = 0; i < 30; i++) { tt += 1 / 60; sim -= (1 / 60) * 365.256; T.simT = sim; T.draw(tt); } ok(T.run < r4, 'temps à l’envers : le sol défile dans l’autre sens');
  // la mini-carte de l'orbite : l'ISS (point blanc) tourne autour de la Terre ; 1 tour = 93 min
  T.speed = T.ISS_FOLLOW_SPEED; T.simT = t0; rec.arcs.length = 0; T.draw(tt + 1);
  const dots = a => a.filter(q => q[2] === 4.5).map(q => [q[0], q[1]]);
  const a1 = dots(rec.arcs)[0]; T.simT = t0 + 93 / 1440 / 4; rec.arcs.length = 0; T.draw(tt + 2); const a2 = dots(rec.arcs)[0]; T.simT = t0 + 93 / 1440; rec.arcs.length = 0; T.draw(tt + 3); const a3 = dots(rec.arcs)[0];
  const cx = 1200 - 92, cy = 800 - 168, ang = p => Math.atan2(cy - p[1], p[0] - cx) * 180 / Math.PI, d = (u, v) => ((u - v) % 360 + 540) % 360 - 180;
  ok(!!a1 && !!a2 && Math.abs(Math.abs(d(ang(a2), ang(a1))) - 90) < 4 && Math.abs(d(ang(a3), ang(a1))) < 4, 'mini-carte : le point de l’ISS fait un quart de tour en 23 min et un tour complet en 93 min (' + ang(a1).toFixed(0) + '° -> ' + ang(a2).toFixed(0) + '° -> ' + ang(a3).toFixed(0) + '°)');
  // sortie : la vitesse d'avant est rétablie
  T.setIssFollow(false); ok(Math.abs(T.speed - 1 / 86400) < 1e-12 || T.speed !== T.ISS_FOLLOW_SPEED, 'sortie : vitesse de simulation rétablie (×' + Math.round(T.speed * 86400) + ')'); }
