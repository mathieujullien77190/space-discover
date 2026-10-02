// node tools/make-plan.js : écrit le plan de vol du lancement fixe (Kourou, Ariane 5 ECA, orbite circulaire de 500 km) :
//   data/plans/kourou-ariane5-500km.json   (le fichier à lire et à modifier à la main)
//   js/data/plans.js                        (même contenu en variable JavaScript : la page s'ouvre aussi en file://)
// Le plan est EXTRAIT d'une simulation avec guidage (simulateLaunch) : instants des événements, direction de la poussée au cours du temps, masses ; ensuite js/flight-plan.js le rejoue SANS guidage et retrouve la même trajectoire.
// Après avoir modifié le JSON à la main : `node tools/make-plan.js --wrap` régénère seulement js/data/plans.js ; sur http(s) la page relit le JSON directement (pas besoin de régénérer).
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..'), ctx = { console, Math, Date, JSON }; vm.createContext(ctx);
for (const f of ['js/physics.js', 'js/launch.js', 'js/rockets.js', 'js/flight-plan.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const jsonPath = path.join(root, 'data', 'plans', 'kourou-ariane5-500km.json'), jsPath = path.join(root, 'js', 'data', 'plans.js');
const wrap = plan => fs.writeFileSync(jsPath, '// GÉNÉRÉ par tools/make-plan.js à partir de data/plans/*.json : ne pas éditer (modifier le JSON puis `node tools/make-plan.js --wrap`).\nconst FLIGHT_PLANS = { kourou500: ' + JSON.stringify(plan) + ' };\n');
if (process.argv.includes('--wrap')) { wrap(JSON.parse(fs.readFileSync(jsonPath, 'utf8'))); console.log('écrit js/data/plans.js'); process.exit(0); }
const out = vm.runInContext(`(() => {
  const rk = ROCKETS.ariane5, L = Object.assign({}, LCH, rk.phys), N = Object.assign({}, LCH_NAMES, rk.names);
  const SITE = { name: 'Kourou (Guyane)', lat: 5.2408, lon: -52.7688, azimuthDeg: 90 }, KM = 500, PAYLOAD = 3000;
  const fine = Object.assign({}, rk, { phys: Object.assign({}, rk.phys, { SAMPLE: 0.1 }) });   // échantillon à CHAQUE pas de 0,1 s : la table de direction contient la valeur exacte de chaque pas (marches comprises)
  const sim = simulateLaunch(KM, { lat: SITE.lat, payload: PAYLOAD, az: Math.PI / 2, rocket: fine });
  if (!sim.ok) throw new Error('simulation de référence : orbite non atteinte');
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
  return JSON.stringify({
    name: 'Kourou — Ariane 5 ECA — orbite circulaire de ' + KM + ' km', version: 1,
    site: SITE, rocket: 'ariane5', target: { altitudeKm: KM },
    vehicle: {
      payloadKg: PAYLOAD, fairingKg: L.fairing, cdA: L.cdA, dt: L.DT, sampleEvery: LCH.SAMPLE,
      boosters: { count: L.eap.n, propKg: L.eap.prop, dryKg: L.eap.dry, burnS: L.eap.burn, ispVac: L.eap.ispV, ispSea: L.eap.ispS, thrustProfile: 'srb' },
      stage1: { propKg: L.epc.prop, dryKg: L.epc.dry, burnS: L.epc.burn, ispVac: L.epc.ispV, ispSea: L.epc.ispS },
      stage2: { propKg: L.esc.prop, dryKg: L.esc.dry, thrustN: L.esc.F, isp: L.esc.isp },
    },
    pitch: { unit: 'degrés au-dessus de l’horizontale locale (90 = vertical), interpolé linéairement entre les points [temps en s, angle]', table },
    events,
  });
})()`, ctx);
const plan = JSON.parse(out);
fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
// JSON lisible : un événement par ligne, la table de direction sur quelques lignes
const lines = JSON.stringify(plan, null, 2).replace(/\{\n\s+"t": ([^\n]+)\n(?:\s+"[^\n]+\n)+?\s+\}/g, m => m.replace(/\n\s+/g, ' ')).replace(/\[\n\s+(-?[\d.]+),\n\s+(-?[\d.]+)\n\s+\]/g, '[$1, $2]');
fs.writeFileSync(jsonPath, lines + '\n'); wrap(plan);
console.log('plan écrit : ' + plan.events.length + ' événements, ' + plan.pitch.table.length + ' points de direction, ' + Math.round(fs.statSync(jsonPath).size / 1024 * 10) / 10 + ' Ko');
