// node tools/make-starship.js : plan de vol Starship + Super Heavy depuis Starbase (Texas) vers une orbite circulaire de 500 km, AVEC retour du booster sur la tour :
//   data/plans/starbase-starship-500km.json   (montée du vaisseau + plan de retour du booster)
//   js/data/plans.js                           (copie embarquée de tous les plans, file://)
// Montée : extraite d'une simulation avec guidage (comme tools/make-plan.js). Retour : le booster est guidé en boucle fermée par cet outil (boostback, chute libre, allumage d'atterrissage, guidage polynomial vers la tour) ;
// les commandes appliquées (direction, poussée) sont enregistrées dans des TABLES ; js/flight-plan.js (flyReturn) les rejoue sans guidage et retrouve le même atterrissage.
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..'), ctx = { console, Math, Date, JSON }; vm.createContext(ctx);
for (const f of ['js/physics.js', 'js/launch.js', 'js/rockets.js', 'js/flight-plan.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const jsonPath = path.join(root, 'data', 'plans', 'starbase-starship-500km.json');
ctx.DBG = process.env.DBG ? 1 : undefined; if (!process.env.DBG) delete ctx.DBG;
const out = vm.runInContext(`(() => {
  const NL = String.fromCharCode(10), rk = ROCKETS.starship, L = Object.assign({}, LCH, rk.phys), N = Object.assign({}, LCH_NAMES, rk.names), DEG = Math.PI / 180;
  const hex = c => '#' + c.toString(16).padStart(6, '0'), visualOf = rk0 => { const m = JSON.parse(JSON.stringify(rk0.model)); for (const k of ['core', 'boosters', 'upper', 'fairing']) if (m[k]) { if (m[k].color != null) m[k].color = hex(m[k].color); if (m[k].band != null) m[k].band = hex(m[k].band); } return { name: rk0.name, short: rk0.short, tower: !!rk0.tower, names: { booster: rk0.names.booster || '', stage1: rk0.names.stage1, stage2: rk0.names.stage2 }, model: m }; };
  const SITE = { name: 'Starbase (Boca Chica, Texas)', lat: 25.997, lon: -97.156, azimuthDeg: 90 }, KM = 500, PAYLOAD = 50e3, round = (v, d) => Math.round(v * d) / d;
  const fine = Object.assign({}, rk, { phys: Object.assign({}, rk.phys, { SAMPLE: 0.1 }) });
  const sim = simulateLaunch(KM, { lat: SITE.lat, payload: PAYLOAD, az: Math.PI / 2, rocket: fine });
  if (!sim.ok) throw new Error('montée : orbite non atteinte');
  const E = {}; for (const e of sim.events) E[e.key] = e;
  const events = [
    { t: 0, do: 'ignite', engine: 'stage1', key: 't0', label: 'Décollage (33 Raptor)' },
    { t: E.meco.t, do: 'cutoff', engine: 'stage1', key: 'meco', label: N.meco },
    { t: E.epcsep.t, do: 'separate', part: 'stage1', key: 'epcsep', label: N.epcsep },
    { t: E.esc1.t, do: 'ignite', engine: 'stage2', key: 'esc1', label: N.esc1, phase: 'transfert' },
    { t: E.esc1end.t, do: 'cutoff', engine: 'stage2', key: 'esc1end', label: N.esc1end, phase: 'transfert (sans poussée)' },
    { t: E.esc2.t, do: 'ignite', engine: 'stage2', key: 'esc2', label: N.esc2, phase: 'circularisation' },
    { t: E.esc2end.t, do: 'cutoff', engine: 'stage2', key: 'esc2end', label: N.esc2end, phase: 'en orbite' },
    { t: E.sat.t, do: 'separate', part: 'payload', key: 'sat', label: N.sat },
  ];
  const pts = sim.samples.filter(s => s.F > 0).map(s => [s.t, s.phi / DEG]);
  const dp = (p, tol) => { if (p.length < 3) return p; let md = 0, mi = 0; const a = p[0], b = p[p.length - 1]; for (let i = 1; i < p.length - 1; i++) { const f = (p[i][0] - a[0]) / (b[0] - a[0]), d = Math.abs(p[i][1] - (a[1] + (b[1] - a[1]) * f)); if (d > md) { md = d; mi = i; } } return md > tol ? dp(p.slice(0, mi + 1), tol).slice(0, -1).concat(dp(p.slice(mi), tol)) : [a, b]; };
  const table = dp(pts, 0.0004).map(([t, a]) => [round(t, 1000), round(a, 100000)]);

  // ---------- retour du booster ----------
  // Boostback décrit par des tables (direction et poussée, éditables à la main) puis atterrissage « hoverslam » décrit par des paramètres (voir flyReturn). Recherche : durée et poussée du boostback, marge d'allumage.
  const sep = E.epcsep, r0 = Math.hypot(sep.x, sep.y), dvSep = rk.sepDv.epcsep, wEff = LCH.WE * Math.cos(SITE.lat * DEG);
  const start = { t: sep.t, x: sep.x, y: sep.y, vx: sep.vx - dvSep * sep.y / r0, vy: sep.vy + dvSep * sep.x / r0, wEff };
  const VEH = { dryKg: 275e3, propKg: 600e3, thrustN: 76e6, ispVac: 350, ispSea: 327, cdA: 30, dt: 0.1, sampleEvery: 1 }, HP = 70;   // poussée relative à 33 moteurs ; tour : bras de capture à 70 m
  const LAND = { mode: 'hoverslam', totalEngines: 33, enginesFar: 13, enginesNear: 7, enginesMin: 1.2, farSpeedMs: 60, ignitionMargin: 0.12, aimAltitudeM: HP - 1, crossingSpeedMs: 2, horizontalKp: 0.01, horizontalKd: 0.25, horizontalMaxAccel: 8 };
  const mkRet = (tb0, tbDur, tbThr, margin) => ({ vehicle: VEH, target: { altitudeM: HP }, landing: Object.assign({}, LAND, { ignitionMargin: margin }),
    pitch: { table: [[round(tb0, 100), 172]] }, throttle: { table: [[round(tb0 - 0.1, 100), 0], [round(tb0, 100), tbThr], [round(tb0 + tbDur, 100), tbThr], [round(tb0 + tbDur + 0.1, 100), 0]] }, events: [] });
  let best = null; const tb0 = round(sep.t + 5, 10);
  for (const tbThr of [0.3, 0.4]) for (let tbDur = 14; tbDur <= 60; tbDur += 1) for (const margin of [0.12, 0.3]) {
    const res = flyReturn(mkRet(tb0, tbDur, tbThr, margin), start, { tmax: 2500 }), td = res.touchdown; if (!td) continue;
    const score = Math.abs(td.missM) + 200 * Math.max(0, td.speedMs - 6) + (td.propLeftKg < 20e3 ? 1e6 : 0) - 0.0002 * td.propLeftKg;
    if (!best || score < best.score) best = { score, tbThr, tbDur, margin, res };
  }
  if (!best) throw new Error('retour : aucun atterrissage');
  for (let d = -1; d <= 1; d += 0.1) { const tbDur = round(best.tbDur + d, 100), res = flyReturn(mkRet(tb0, tbDur, best.tbThr, best.margin), start, { tmax: 2500 }), td = res.touchdown; if (!td) continue; const score = Math.abs(td.missM) + 200 * Math.max(0, td.speedMs - 6) - 0.0002 * td.propLeftKg; if (score < best.score) best = { score, tbThr: best.tbThr, tbDur, margin: best.margin, res }; }
  const tbEnd = tb0 + best.tbDur, ret = mkRet(tb0, best.tbDur, best.tbThr, best.margin), rep = flyReturn(ret, start, { tmax: 2500 }), tdr = rep.touchdown, tL = (rep.events.find(e => e.key === 'landingBurn') || { t: 0 }).t;
  ret.events = [
    { t: round(sep.t, 10), key: 'epcsep', label: N.epcsep },
    { t: round(tb0, 10), key: 'boostback', label: 'Boostback : le booster retourne vers le pas de tir' },
    { t: round(tbEnd, 10), key: 'boostbackEnd', label: 'Fin du boostback' },
  ];
  ret.pitch.unit = 'degrés (0 = vers l’avant, 90 = vers le haut, 180 = vers l’arrière), interpolé linéairement';
  ret.throttle.unit = 'fraction de thrustN (tous moteurs allumés) ; 0 = éteint';
  return JSON.stringify({
    name: 'Starbase — Starship + Super Heavy — orbite circulaire de ' + KM + ' km, booster rattrapé par la tour', version: 1,
    site: SITE, rocket: 'starship', target: { altitudeKm: KM }, visual: visualOf(rk),
    vehicle: {
      payloadKg: PAYLOAD, fairingKg: 0, cdA: L.cdA, dt: L.DT, sampleEvery: LCH.SAMPLE,
      boosters: { count: 0, propKg: 0, dryKg: 0, burnS: 1, ispVac: 300, ispSea: 280, thrustProfile: 'const' },
      stage1: { propKg: L.epc.prop, dryKg: L.epc.dry, burnS: L.epc.burn, ispVac: L.epc.ispV, ispSea: L.epc.ispS },
      stage2: { propKg: L.esc.prop, dryKg: L.esc.dry, thrustN: L.esc.F, isp: L.esc.isp },
    },
    pitch: { unit: 'degrés au-dessus de l’horizontale locale (90 = vertical), interpolé linéairement entre les points [temps en s, angle]', table },
    events,
    jettison: { _note: 'Le booster (stage1) revient : voir "returns.stage1". separationSpeedMs : m/s le long de la trajectoire (négatif = vers l’arrière).', stage1: { dryKg: 275e3, returns: true, separationSpeedMs: dvSep, atSeparation: { t: round(sep.t, 10), altitudeKm: round(sep.alt / 1000, 10), speedMs: round(sep.v, 10) } }, payload: { dryKg: PAYLOAD, separationSpeedMs: -0.6, atSeparation: { t: round(E.sat.t, 10), altitudeKm: round(E.sat.alt / 1000, 10), speedMs: round(E.sat.v, 10) } } },
    returns: { stage1: Object.assign({ _note: 'Plan de retour du booster Super Heavy, rejoué par flyReturn (js/flight-plan.js) à partir de l’état à la séparation : boostback décrit par des tables (direction, poussée), atterrissage « hoverslam » décrit par des paramètres (bloc "landing"). Les valeurs "expected" sont calculées (informatives).' }, ret, { expected: { boostbackS: round(best.tbDur, 100), landingBurnStartS: round(tL - sep.t, 10), flightS: round(tdr.t - sep.t, 10), touchdownMissM: round(tdr.missM, 100), touchdownSpeedMs: round(tdr.speedMs, 100), touchdownVerticalMs: round(tdr.verticalMs, 100), propLeftKg: Math.round(tdr.propLeftKg), ok: tdr.ok } }) },
  });
})()`, ctx);
const plan = JSON.parse(out);
fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
const pretty = JSON.stringify(plan, null, 2).replace(/\{\n\s+"t": ([^\n]+)\n(?:\s+"[^\n]+\n)+?\s+\}/g, m => m.replace(/\n\s+/g, ' ')).replace(/\[\n\s+(-?[\d.eE+-]+),\n\s+(-?[\d.eE+-]+)\n\s+\]/g, '[$1, $2]');
fs.writeFileSync(jsonPath, pretty + '\n');
require('./lib-plans').writePlansJs(root);
const x = plan.returns.stage1;
console.log('plan Starship écrit : ' + plan.events.length + ' événements, ' + plan.pitch.table.length + ' points de montée, retour : ' + x.pitch.table.length + ' points de direction, ' + x.throttle.table.length + ' de poussée');
console.log('retour : boostback ' + x.expected.boostbackS + ' s, allumage d’atterrissage à +' + x.expected.landingBurnStartS + ' s, vol ' + x.expected.flightS + ' s, écart à la tour ' + x.expected.touchdownMissM + ' m, vitesse relative ' + x.expected.touchdownSpeedMs + ' m/s (verticale ' + x.expected.touchdownVerticalMs + '), propergol restant ' + x.expected.propLeftKg + ' kg, rejeu ok ' + x.expected.ok);
