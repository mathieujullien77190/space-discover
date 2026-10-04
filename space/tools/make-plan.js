// node tools/make-plan.js : écrit le plan de vol du lancement fixe (Kourou, Ariane 5 ECA, orbite circulaire de 500 km) :
//   data/plans/kourou-ariane5-500km.json   (le fichier à lire et à modifier à la main)
//   js/data/plans.js                        (même contenu en variable JavaScript : la page s'ouvre aussi en file://)
// Le plan est EXTRAIT d'une simulation avec guidage (simulateLaunch) : instants des événements, direction de la poussée au cours du temps, masses ; ensuite js/flight-plan.js le rejoue SANS guidage et retrouve la même trajectoire.
// Après avoir modifié le JSON à la main : `node tools/make-plan.js --wrap` régénère seulement js/data/plans.js ; sur http(s) la page relit le JSON directement (pas besoin de régénérer).
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..'), ctx = { console, Math, Date, JSON }; vm.createContext(ctx);
for (const f of ['js/physics.js', 'js/launch.js', 'js/rockets.js', 'js/flight-plan.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const jsonPath = path.join(root, 'data', 'plans', 'kourou-ariane5-500km.json'), jsPath = path.join(root, 'js', 'data', 'plans.js');
const { writePlansJs } = require('./lib-plans'), wrap = () => writePlansJs(root);
if (process.argv.includes('--wrap')) { wrap(); console.log('écrit js/data/plans.js'); process.exit(0); }
const out = vm.runInContext(`(() => {
  const rk = ROCKETS.ariane5, L = Object.assign({}, LCH, rk.phys), N = Object.assign({}, LCH_NAMES, rk.names);
  const SITE = { name: 'Kourou (Guyane)', lat: 5.2408, lon: -52.7688, azimuthDeg: 90 }, KM = 500, PAYLOAD = 3000;
  const fine = Object.assign({}, rk, { phys: Object.assign({}, rk.phys, { SAMPLE: 0.1 }) });   // échantillon à CHAQUE pas de 0,1 s : la table de direction contient la valeur exacte de chaque pas (marches comprises)
  const sim = simulateLaunch(KM, { lat: SITE.lat, payload: PAYLOAD, az: Math.PI / 2, rocket: fine });
  if (!sim.ok) throw new Error('simulation de référence : orbite non atteinte');
  const hex = c => '#' + c.toString(16).padStart(6, '0'), visualOf = rk0 => { const m = JSON.parse(JSON.stringify(rk0.model)); for (const k of ['core', 'boosters', 'upper', 'fairing']) if (m[k]) { if (m[k].color != null) m[k].color = hex(m[k].color); if (m[k].band != null) m[k].band = hex(m[k].band); } return { name: rk0.name, short: rk0.short, tower: !!rk0.tower, names: { booster: rk0.names.booster || '', stage1: rk0.names.stage1, stage2: rk0.names.stage2 }, model: m }; };
  const round = (v, d) => Math.round(v * d) / d, T = e => e.t;
  const E = {}; for (const e of sim.events) E[e.key] = e;
  // événements : instants relevés dans la simulation de référence (valeur exacte : le moteur de plan les retrouve au pas près)
  const events = [
    { t: 0, do: 'ignite', engine: 'boosters', key: 't0', label: 'Décollage' },
    { t: 0, do: 'ignite', engine: 'stage1' },
    { t: T(E.eap), do: 'separate', part: 'boosters', key: 'eap', label: N.eap },
    { t: T(E.fairing), do: 'separate', part: 'fairing', key: 'fairing', label: N.fairing },
    { t: T(E.meco), do: 'cutoff', engine: 'stage1', key: 'meco', label: N.meco },
    { t: T(E.epcsep), do: 'separate', part: 'stage1', key: 'epcsep', label: N.epcsep },
    { t: T(E.esc1), do: 'ignite', engine: 'stage2', key: 'esc1', label: N.esc1, phase: 'transfert' },
    { t: T(E.esc1end), do: 'cutoff', engine: 'stage2', key: 'esc1end', label: N.esc1end, phase: 'transfert (sans poussée)' },
    { t: T(E.esc2), do: 'ignite', engine: 'stage2', key: 'esc2', label: N.esc2, phase: 'circularisation' },
    { t: T(E.esc2end), do: 'cutoff', engine: 'stage2', key: 'esc2end', label: N.esc2end, phase: 'en orbite' },
    { t: T(E.sat), do: 'separate', part: 'payload', key: 'sat', label: N.sat },
  ];
  // direction de la poussée : angle (°) au-dessus de l'horizontale locale, relevé quand un moteur pousse, simplifié (Douglas-Peucker, tolérance 0,0004°)
  const pts = sim.samples.filter(s => s.F > 0).map(s => [s.t, s.phi * 180 / Math.PI]);
  const dp = (p, tol) => { if (p.length < 3) return p; let md = 0, mi = 0; const a = p[0], b = p[p.length - 1]; for (let i = 1; i < p.length - 1; i++) { const f = (p[i][0] - a[0]) / (b[0] - a[0]), d = Math.abs(p[i][1] - (a[1] + (b[1] - a[1]) * f)); if (d > md) { md = d; mi = i; } } return md > tol ? dp(p.slice(0, mi + 1), tol).slice(0, -1).concat(dp(p.slice(mi), tol)) : [a, b]; };
  const table = dp(pts, 0.0004).map(([t, a]) => [round(t, 1000), round(a, 100000)]);
  // objets qui partent du lanceur : masse, forme, vitesse de séparation (poussée de ressorts / rétrofusées, le long de la trajectoire), désintégration ; + ce que le moteur en tire (calculé ici, informatif)
  const mo = rk.model, bo = mo.boosters, fa = mo.fairing, core = mo.core, wE = PH.WE * Math.cos(SITE.lat * Math.PI / 180);
  const jet = {
    _note: 'Entrées (modifiables) : dryKg, residualPropKg, radiusM, lengthM, dragCoefficient, separationSpeedMs (m/s le long de la trajectoire, négatif = vers l’arrière), disintegrates, disintegrationAltitudeKm. "atSeparation" et "expected" sont CALCULÉS à l’extraction (informatifs, non lus par le moteur).',
    boosters: { count: L.eap.n, dryKg: L.eap.dry, residualPropKg: 0, radiusM: bo.r, lengthM: round(bo.h + bo.nose + mo.noz.eap, 100), dragCoefficient: 1, separationSpeedMs: (rk.sepDv && rk.sepDv.eap) || -1.5, disintegrates: false },
    fairing: { pieces: 2, dryKgEach: L.fairing / 2, residualPropKg: 0, radiusM: fa.r, lengthM: round(fa.cyl + fa.cone / 2, 100), dragCoefficient: 1, separationSpeedMs: (rk.sepDv && rk.sepDv.fairing) || 0.3, disintegrates: false },
    stage1: { dryKg: L.epc.dry, residualPropKg: round(L.epc.prop * 0.02, 1), radiusM: core.r, lengthM: round(core.h + mo.noz.epc, 100), dragCoefficient: 1, separationSpeedMs: (rk.sepDv && rk.sepDv.epcsep) || -1, disintegrates: true, disintegrationAltitudeKm: E.epcsep.alt > 150e3 ? 120 : 70 },
    payload: { dryKg: PAYLOAD, separationSpeedMs: (rk.sepDv && rk.sepDv.sat) || -0.6 },
  };
  const calc = (key, j, dry, prop, shape, burns, thrKm) => {
    const e = E[key], r = Math.hypot(e.x, e.y), dv = j.separationSpeedMs, b = new Body({ name: key, dry, prop, shape, cd: j.dragCoefficient }, { x: e.x, y: e.y, vx: e.vx - dv * e.y / r, vy: e.vy + dv * e.x / r, t: 0 }, { wEff: wE, mode: 'tumble' });
    const res = b.propagate({ tMax: 9000, sampleDt: 1, burnupAlt: burns ? thrKm * 1000 : null }), s = res.samples[res.samples.length - 1];
    j.atSeparation = { t: round(e.t, 10), altitudeKm: round(e.alt / 1000, 10), speedMs: round(e.v, 10) };
    j.expected = { fallS: Math.round(s.t), endAltitudeKm: round(s.alt / 1000, 10), endSpeedMs: round(s.v, 10), end: res.end.reason === 'burnup' ? 'se désintègre' : res.end.reason === 'impact' ? 'tombe dans l’océan' : res.end.reason };
  };
  calc('eap', jet.boosters, jet.boosters.dryKg, 0, { type: 'cyl', r: jet.boosters.radiusM, h: jet.boosters.lengthM }, false, 0);
  calc('fairing', jet.fairing, jet.fairing.dryKgEach, 0, { type: 'shell', r: jet.fairing.radiusM, h: jet.fairing.lengthM }, false, 0);
  calc('epcsep', jet.stage1, jet.stage1.dryKg, jet.stage1.residualPropKg, { type: 'cyl', r: jet.stage1.radiusM, h: jet.stage1.lengthM }, true, jet.stage1.disintegrationAltitudeKm);
  { const e = E.sat; jet.payload.atSeparation = { t: round(e.t, 10), altitudeKm: round(e.alt / 1000, 10), speedMs: round(e.v, 10) }; }
  return JSON.stringify({
    name: 'Kourou — Ariane 5 ECA — orbite circulaire de ' + KM + ' km', version: 1,
    site: SITE, rocket: 'ariane5', visual: visualOf(rk), target: { altitudeKm: KM },
    vehicle: {
      payloadKg: PAYLOAD, fairingKg: L.fairing, cdA: L.cdA, dt: L.DT, sampleEvery: LCH.SAMPLE,
      boosters: { count: L.eap.n, propKg: L.eap.prop, dryKg: L.eap.dry, burnS: L.eap.burn, ispVac: L.eap.ispV, ispSea: L.eap.ispS, thrustProfile: 'srb' },
      stage1: { propKg: L.epc.prop, dryKg: L.epc.dry, burnS: L.epc.burn, ispVac: L.epc.ispV, ispSea: L.epc.ispS },
      stage2: { propKg: L.esc.prop, dryKg: L.esc.dry, thrustN: L.esc.F, isp: L.esc.isp },
    },
    pitch: { unit: 'degrés au-dessus de l’horizontale locale (90 = vertical), interpolé linéairement entre les points [temps en s, angle]', table },
    events,
    jettison: jet,
  });
})()`, ctx);
const plan = JSON.parse(out);
fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
// JSON lisible : un événement par ligne, la table de direction sur quelques lignes
const lines = JSON.stringify(plan, null, 2).replace(/\{\n\s+"t": ([^\n]+)\n(?:\s+"[^\n]+\n)+?\s+\}/g, m => m.replace(/\n\s+/g, ' ')).replace(/\[\n\s+(-?[\d.]+),\n\s+(-?[\d.]+)\n\s+\]/g, '[$1, $2]');
fs.writeFileSync(jsonPath, lines + '\n'); wrap();
console.log('plan écrit : ' + plan.events.length + ' événements, ' + plan.pitch.table.length + ' points de direction, ' + Math.round(fs.statSync(jsonPath).size / 1024 * 10) / 10 + ' Ko');
