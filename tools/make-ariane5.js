// Fabrique objects/ariane5/ (Ariane 5 ECA en JSON « objet » + une pièce larguable par fichier) à partir des données du plan de vol d'origine (data/plans/kourou-ariane5-500km.json : masses, moteurs, instants des
// événements, courbe de tangage). Les paliers du JSON reprennent le débit et l'Isp de chaque moteur : le moteur d'objet (js/flight-object.js) retrouve la trajectoire du plan. Ensuite : node tools/make-objects.js.
// Sortie : objects/ariane5/{ariane5,booster,fairing,stage1,satellite}.json ; compare l'orbite et la masse avec flyPlan. node tools/make-ariane5.js
const fs = require('fs'), vm = require('vm'), path = require('path'), root = path.join(__dirname, '..'), out = path.join(root, 'objects', 'ariane5'), ctx = { console, Math, Date, JSON }; vm.createContext(ctx);
for (const f of ['js/physics.js', 'js/launch.js', 'js/rockets.js', 'js/flight-plan.js', 'js/flight-object.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const plan = JSON.parse(fs.readFileSync(path.join(root, 'data/plans/kourou-ariane5-500km.json'), 'utf8')), V = plan.vehicle, B = V.boosters, S1 = V.stage1, S2 = V.stage2, G0 = 9.80665, r1 = (x, n) => Math.round(x * (n || 10)) / (n || 10);
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
// pitch : points de la courbe d'origine, simplifiés (Douglas-Peucker, 0,05°)
const pts = plan.pitch.table, tol = +process.env.TOL || 0.05, keep = new Set([0, pts.length - 1]);
(function rdp(a, b) { let dmax = 0, im = -1; for (let i = a + 1; i < b; i++) { const f = (pts[i][0] - pts[a][0]) / Math.max(1e-9, pts[b][0] - pts[a][0]), d = Math.abs(pts[i][1] - (pts[a][1] + f * (pts[b][1] - pts[a][1]))); if (d > dmax) { dmax = d; im = i; } } if (dmax > tol) { keep.add(im); rdp(a, im); rdp(im, b); } })(0, pts.length - 1);
const pitchTl = [...keep].sort((a, b) => a - b).map(i => ({ t: r1(pts[i][0], 10), pitch: r1(pts[i][1], 100) }));
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
tl.push({ t: r1(ev('esc1'), 10), burnKgS: r1(mdS2, 1000), ispVac: S2.isp, ispSea: S2.isp, flames: ['esc'], label: 'Allumage de l’étage supérieur', key: 'esc1', phase: 'transfert' });
tl.push({ t: r1(ev('esc1end'), 10), burnKgS: 0, flames: [], label: 'Fin de la 1re poussée', key: 'esc1end', phase: 'transfert (sans poussée)' });
tl.push({ t: r1(ev('esc2'), 10), burnKgS: r1(mdS2, 1000), flames: ['esc'], label: 'Allumage à l’apogée (circularisation)', key: 'esc2', phase: 'circularisation' });
tl.push({ t: r1(ev('esc2end'), 10), burnKgS: 0, flames: [], label: 'Extinction : orbite atteinte', key: 'esc2end', phase: 'en orbite' });
tl.push({ t: r1(ev('sat'), 10), release: [{ part: 'satellite', count: 1 }], label: 'Satellite largué' });
let timeline = tl.concat(pitchTl).sort((a, b) => a.t - b.t);
// réglage des deux dernières poussées : fin de la 1re (apogée visée), allumage à l'apogée et durée de la 2e (circularisation), cherchés pour viser l'orbite du plan (500 x 502 km) ; le reste n'est pas touché
{ const e1e = timeline.find(e => e.key === 'esc1end'), e2 = timeline.find(e => e.key === 'esc2'), e2e = timeline.find(e => e.key === 'esc2end'), sat = timeline.find(e => e.release && e.release[0].part === 'satellite'), a1 = e1e.t, a2 = e2.t, d2 = e2e.t - e2.t; let best = null;
  const run = (t1, ti, dur) => { e1e.t = r1(t1, 100); e2.t = r1(ti, 100); e2e.t = r1(ti + dur, 100); sat.t = r1(ti + dur + 0.1, 100); ctx.TRY = { name: 'x', start: { lat: plan.site.lat, lon: plan.site.lon, altitudeKm: 0, azimuthDeg: 90, elevationDeg: 90, speedMs: 0 }, parts, timeline: timeline.slice().sort((x, y) => x.t - y.t) };
    return vm.runInContext('(() => { const r = flyObject(TRY); return r.ok ? [(r.orbit.rp - 6378137) / 1000, (r.orbit.ra - 6378137) / 1000] : null; })()', ctx); };
  for (let t1 = a1 - 2; t1 <= a1 + 4; t1 += 0.5) for (let ti = a2 - 4; ti <= a2 + 8; ti += 1) for (let dur = d2 - 2; dur <= d2 + 4; dur += 0.25) { const o = run(t1, ti, dur); if (!o) continue; const e = Math.abs(o[0] - 500) + Math.abs(o[1] - 502); if (!best || e < best.e) best = { e, t1, ti, dur }; }
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
