// Fabrique objects/ariane5/ (Ariane 5 ECA en JSON « objet » + une pièce larguable par fichier) à partir des données du plan de vol d'origine (data/plans/kourou-ariane5-500km.json : masses, moteurs, instants des
// événements, courbe de tangage). Les paliers du JSON reprennent le débit et l'Isp de chaque moteur : le moteur d'objet (src/engine/flight-object.js) retrouve la trajectoire du plan. Ensuite : node tools/make-objects.js.
// Sortie : objects/ariane5/{ariane5,booster,fairing,stage1,satellite}.json ; compare l'orbite et la masse avec flyPlan. node tools/make-ariane5.js
const fs = require('fs'), vm = require('vm'), path = require('path'), root = path.join(__dirname, '..'), out = path.join(root, 'public', 'objects', 'ariane5'), ctx = { console, Math, Date, JSON }; vm.createContext(ctx);
require('./lib-engine').loadEngineIntoSync(ctx);
const plan = JSON.parse(fs.readFileSync(path.join(root, 'public/data/plans/kourou-ariane5-500km.json'), 'utf8')), V = plan.vehicle, B = V.boosters, S1 = V.stage1, S2 = V.stage2, G0 = 9.80665, r1 = (x, n) => Math.round(x * (n || 10)) / (n || 10);
const ev = k => plan.events.find(e => e.key === k).t;
// --- pièces larguables : un JSON chacune ---
const parts = {
  booster: { name: plan.visual.names.booster, role: 'booster', massKg: B.dryKg, residualPropKg: 0, visual: { radiusM: 1.5, lengthM: 31, noseM: 3.2, nozzleM: 3.5, color: '#f2f2f2', bandColor: '#b83030' }, dragCoefficient: plan.jettison.boosters.dragCoefficient, separationSpeedMs: plan.jettison.boosters.separationSpeedMs, disintegrates: false },
  fairing: { name: 'Coiffe (moitié)', role: 'fairing', massKg: plan.jettison.fairing.dryKgEach, residualPropKg: 0, visual: { radiusM: 2.7, cylM: 12, coneM: 6, color: '#f2f2f2' }, dragCoefficient: plan.jettison.fairing.dragCoefficient, separationSpeedMs: plan.jettison.fairing.separationSpeedMs, disintegrates: false },
  stage1: { name: plan.visual.names.stage1, role: 'stage', massKg: S1.dryKg, residualPropKg: Math.round(S1.propKg - S1.propKg / S1.burnS * ev('meco')),   /* propergol qui reste à l'arrêt du moteur (T+523 s sur 540 s de combustion) : la masse libérée au largage doit être exacte */ visual: { radiusM: 2.7, lengthM: 30.5, nozzleM: 5.5, color: '#d8b48a' }, dragCoefficient: plan.jettison.stage1.dragCoefficient, separationSpeedMs: plan.jettison.stage1.separationSpeedMs, disintegrates: true, disintegrationAltitudeKm: plan.jettison.stage1.disintegrationAltitudeKm },
  satellite: { name: 'Satellite', role: 'payload', massKg: V.payloadKg, visual: { radiusM: 1.2, lengthM: 3 }, separationSpeedMs: plan.jettison.payload.separationSpeedMs },
};
// --- masse initiale : tout ce qui part avec la fusée ---
const m0 = B.count * (B.dryKg + B.propKg) + S1.dryKg + S1.propKg + S2.dryKg + S2.propKg + V.fairingKg + V.payloadKg;
// --- débit et Isp effectifs des moteurs allumés ---
const srb = t => (1.35 - 0.55 * t / B.burnS) / 1.075, mdB = t => B.count * B.propKg / B.burnS * srb(t), mdS1 = S1.propKg / S1.burnS, mdS2 = S2.thrustN / (S2.isp * G0);
const tl = [], tSep = ev('eap'), STEP = +process.env.STEP || 5;
// pitch : une courbe LISSE de 10 points, cherchée ci-dessous (demande de l'utilisateur : pas les 93 points hérités de l'ancien guidage, qui corrigeait l'altitude de l'étage principal par à-coups de −11° à +44° en quelques secondes) ;
// aux poussées de l'étage supérieur la poussée suit la vitesse (« prograde »)
const PT = [0, 8, 20, 40, 70, 130, 200, 300, 400, r1(ev('meco'), 10)];   // dates des points (s)
const pitchTl = k => PT.map((t, i) => ({ t, pitch: r1(k[i], 100) }));
let knots = [90, 90, 78, 66, 56, 42, 30, 18, 9, 2];   // valeur de départ : virage gravitationnel approximatif
// montée à deux moteurs : un palier tous les STEP s (le débit des boosters à poudre décroît), débit et Isp effectifs au milieu de l'intervalle
for (let a = 0; a < tSep - 1e-6; a += STEP) {
  const mid = a + STEP / 2, b = mdB(mid), c = mdS1, md = b + c, entry = { t: a, burnKgS: r1(md, 10), ispVac: r1((b * B.ispVac + c * S1.ispVac) / md, 10), ispSea: r1((b * B.ispSea + c * S1.ispSea) / md, 10) };
  if (a === 0) Object.assign(entry, { massKg: m0, cdA: V.cdA, flames: ['eap', 'epc'], label: 'Décollage', key: 't0' });
  tl.push(entry);
}
tl.push({ t: r1(tSep, 10), release: [{ part: 'booster', count: B.count }], burnKgS: r1(mdS1, 1000), ispVac: S1.ispVac, ispSea: S1.ispSea, flames: ['epc'], label: 'Séparation des boosters à poudre' });
tl.push({ t: r1(ev('fairing'), 10), release: [{ part: 'fairing', count: 2 }], label: 'Largage de la coiffe' });
tl.push({ t: r1(ev('meco'), 10), burnKgS: 0, flames: [], label: 'Arrêt du moteur principal', key: 'meco' });
tl.push({ t: r1(ev('epcsep'), 10), release: [{ part: 'stage1', count: 1 }], label: 'Séparation de l’étage principal' });
tl.push({ t: r1(ev('esc1'), 10), burnKgS: r1(mdS2, 1000), ispVac: S2.isp, ispSea: S2.isp, flames: ['esc'], pitch: 'prograde', label: 'Allumage de l’étage supérieur', key: 'esc1', phase: 'transfert' });
tl.push({ t: r1(ev('esc1end'), 10), burnKgS: 0, flames: [], label: 'Fin de la 1re poussée', key: 'esc1end', phase: 'transfert (sans poussée)' });
tl.push({ t: r1(ev('esc2'), 10), burnKgS: r1(mdS2, 1000), flames: ['esc'], pitch: 'prograde', label: 'Allumage à l’apogée (circularisation)', key: 'esc2', phase: 'circularisation' });
tl.push({ t: r1(ev('esc2end'), 10), burnKgS: 0, flames: [], label: 'Extinction : orbite atteinte', key: 'esc2end', phase: 'en orbite' });
tl.push({ t: r1(ev('sat'), 10), release: [{ part: 'satellite', count: 1 }], label: 'Satellite largué' });
const mkTL = k => tl.concat(pitchTl(k)).sort((a, b) => a.t - b.t || (typeof a.pitch === 'number' ? -1 : 0));
const startS = { lat: plan.site.lat, lon: plan.site.lon, altitudeKm: 0, azimuthDeg: 90, elevationDeg: 90, speedMs: 0 };
const flyK = k => { ctx.TRYK = { name: 'x', start: startS, parts, timeline: mkTL(k) }; return vm.runInContext('flyObject(TRYK)', ctx); };
const elAt = (r, t) => { const q = r.samples.find(x => x.t >= t - 1e-6) || r.samples[r.samples.length - 1]; ctx.QS = q; return vm.runInContext('lchElements(Math.hypot(QS.x, QS.y), (QS.vx * QS.x + QS.vy * QS.y) / Math.hypot(QS.x, QS.y), (QS.vy * QS.x - QS.vx * QS.y) / Math.hypot(QS.x, QS.y))', ctx); };
// cible : l'orbite de l'ancien plan à la fin de la 1re poussée de l'étage supérieur (même énergie, même apogée)
ctx.PL = plan; const tgt = vm.runInContext('(() => { const p = flyPlan(PL), q = p.samples.find(x => x.t >= ' + ev('esc1end') + '); return lchElements(Math.hypot(q.x, q.y), (q.vx * q.x + q.vy * q.y) / Math.hypot(q.x, q.y), (q.vy * q.x - q.vx * q.y) / Math.hypot(q.x, q.y)); })()', ctx);
// régularité : on pénalise les changements de pente de la courbe de pitch (pas de coude brusque)
const rough = k => { let p = 0; for (let i = 2; i < k.length; i++) { const s1 = (k[i - 1] - k[i - 2]) / (PT[i - 1] - PT[i - 2]), s2 = (k[i] - k[i - 1]) / (PT[i] - PT[i - 1]); p += Math.abs(s2 - s1); } return p; };
const orbErr = k => { const o = elAt(flyK(k), ev('esc1end')); return Math.abs(o.ra - tgt.ra) / 1000 + Math.abs(o.rp - tgt.rp) / 1000; };
const lossK = k => orbErr(k) + 120 * rough(k);
{ let bl = lossK(knots), seed = 5; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 - 0.5; };
  for (let it = 0; it < 2600; it++) { const sig = it < 700 ? 4 : it < 1400 ? 1.5 : 0.5, k = knots.slice(); for (let i = 2; i < k.length; i++) if (rnd() > -0.1) k[i] += rnd() * 2 * sig; for (let i = 3; i < k.length; i++) k[i] = Math.min(k[i], k[i - 1]); if (k[k.length - 1] < -3) continue; const l = lossK(k); if (l < bl) { bl = l; knots = k; } }
  const o = elAt(flyK(knots), ev('esc1end')); console.log('pitch lisse : ' + knots.map(v => r1(v, 10)).join(', ') + ' (aux dates ' + PT.join(', ') + ') → à la fin de la 1re poussée de l’étage supérieur : orbite ' + Math.round((o.rp - 6378137) / 1000) + ' x ' + Math.round((o.ra - 6378137) / 1000) + ' km (cible ' + Math.round((tgt.rp - 6378137) / 1000) + ' x ' + Math.round((tgt.ra - 6378137) / 1000) + ' km, erreur d’orbite ' + orbErr(knots).toFixed(1) + ' km, rugosité ' + rough(knots).toFixed(3) + ' °/s)'); }
let timeline = mkTL(knots);
// réglage des deux dernières poussées : fin de la 1re (apogée visée), allumage à l'apogée et durée de la 2e (circularisation), cherchés pour viser l'orbite du plan (500 x 502 km) ; le reste n'est pas touché
{ const e1e = timeline.find(e => e.key === 'esc1end'), e2 = timeline.find(e => e.key === 'esc2'), e2e = timeline.find(e => e.key === 'esc2end'), sat = timeline.find(e => e.release && e.release[0].part === 'satellite'), a1 = e1e.t, d2 = e2e.t - e2.t; let best = null;
  // instant d'apogée réel (la courbe de pitch a changé l'orbite) : l'allumage de la circularisation est cherché autour de lui
  const r0 = flyK(knots); let ia = -1; for (let i = 0; i < r0.samples.length; i++) if (r0.samples[i].t > a1 && r0.samples[i].t < e2.t && (ia < 0 || r0.samples[i].alt > r0.samples[ia].alt)) ia = i; const tApo = r0.samples[ia].t, a2 = tApo - d2 / 2;
  const run = (t1, ti, dur) => { e1e.t = r1(t1, 100); e2.t = r1(ti, 100); e2e.t = r1(ti + dur, 100); sat.t = r1(ti + dur + 0.1, 100); ctx.TRY = { name: 'x', start: { lat: plan.site.lat, lon: plan.site.lon, altitudeKm: 0, azimuthDeg: 90, elevationDeg: 90, speedMs: 0 }, parts, timeline: timeline.slice().sort((x, y) => x.t - y.t) };
    return vm.runInContext('(() => { const r = flyObject(TRY); return r.ok ? [(r.orbit.rp - 6378137) / 1000, (r.orbit.ra - 6378137) / 1000] : null; })()', ctx); };
  for (let t1 = a1 - 1; t1 <= a1 + 1; t1 += 0.5) for (let ti = a2 - 12; ti <= a2 + 12; ti += 1) for (let dur = Math.max(8, d2 - 10); dur <= d2 + 10; dur += 0.5) { const o = run(t1, ti, dur); if (!o) continue; const e = Math.abs(o[0] - 500) + Math.abs(o[1] - 502); if (!best || e < best.e) best = { e, t1, ti, dur }; }
  run(best.t1, best.ti, best.dur); console.log('poussées réglées : fin de la 1re T+' + e1e.t + ', allumage T+' + e2.t + ', durée ' + r1(e2e.t - e2.t, 100) + ' s (erreur d’orbite ' + best.e.toFixed(1) + ' km)');
  timeline = timeline.slice().sort((x, y) => x.t - y.t); }
const main = {
  name: 'Ariane 5 ECA — orbite de 500 km',
  start: { lat: plan.site.lat, lon: plan.site.lon, altitudeKm: 0, azimuthDeg: plan.site.azimuthDeg, elevationDeg: 90, speedMs: 0 },
  visual: { name: plan.visual.name, short: plan.visual.short, stack: { core: 'stage1', boosters: { part: 'booster', count: B.count, radialM: 4.4 }, upper: { name: plan.visual.names.stage2, radiusM: 2.5, lengthM: 4.6, color: '#bfc3c8', nozzleM: 2.2 }, fairing: 'fairing', fairingPieces: 2 } },
  parts: { booster: 'booster.json', fairing: 'fairing.json', stage1: 'stage1.json', satellite: 'satellite.json' },
  timeline,
};
main.timeline = timeline;
// --- écriture : un palier par ligne ---
const NL = String.fromCharCode(10), fmt = (o) => JSON.stringify(o, null, 2).replace(/\{\n\s+"t": ([\s\S]*?)\n\s+\}(?=,?\n\s+[\{\]])/g, m => m.replace(/\n\s+/g, ' ')).replace(/\[\n\s+("[^"]*"[^\]]*?)\n\s+\]/g, m => m.replace(/\n\s+/g, ' '));
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'ariane5.json'), fmt(main) + NL);
for (const [k, v] of Object.entries(parts)) fs.writeFileSync(path.join(out, k + '.json'), JSON.stringify(v, null, 2) + NL);
// --- vérification : même trajectoire que le plan d'origine ? ---
const full = JSON.parse(JSON.stringify(main)); full.parts = parts;
ctx.OBJ = full; ctx.PLAN = plan;
console.log(vm.runInContext(`(() => { const o = flyObject(OBJ), p = flyPlan(PLAN), km = x => Math.round((x - 6378137) / 1000), N = String.fromCharCode(10), mm = s => s[s.length - 1];
  let worst = 0; const n = Math.min(o.samples.length, p.samples.length); for (let i = 0; i < n; i += 4) worst = Math.max(worst, Math.hypot(o.samples[i].x - p.samples[i].x, o.samples[i].y - p.samples[i].y));
  return 'objet : orbite ' + km(o.orbit.rp) + ' x ' + km(o.orbit.ra) + ' km, ok ' + o.ok + ', fin T+' + o.tEnd.toFixed(1) + ' s, ' + o.events.length + ' événements, ' + OBJ.timeline.length + ' paliers' + N + 'plan   : orbite ' + km(p.orbit.rp) + ' x ' + km(p.orbit.ra) + ' km, ok ' + p.ok + ', fin T+' + p.tEnd.toFixed(1) + ' s' + N + 'écart de position max : ' + (worst / 1000).toFixed(2) + ' km ; masse à T+120 : ' + Math.round(o.samples.find(s => s.t >= 120).m) + ' / ' + Math.round(p.samples.find(s => s.t >= 120).m) + ' kg ; à T+300 : ' + Math.round(o.samples.find(s => s.t >= 300).m) + ' / ' + Math.round(p.samples.find(s => s.t >= 300).m) + ' kg' + N + 'événements : ' + o.events.map(e => e.key + '@' + e.t.toFixed(0)).join(' ') + N + 'jettison : ' + Object.keys(o.plan.jettison).join(', ');
})()`, ctx));
