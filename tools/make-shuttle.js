// Fabrique objects/shuttle/ (navette spatiale américaine en JSON « objet » + une pièce larguable par fichier) : masses, moteurs, programme de tangage réglé par recherche pour atteindre une orbite basse.
// ⚠ Valeurs de MÉMOIRE (ordres de grandeur, à vérifier avant de les citer) : masse au décollage ≈ 2 050 t ; 2 boosters à poudre (SRB) de 590 t dont 503 t de poudre, 124 s de combustion, poussée ≈ 12,5 MN chacun au décollage
// puis décroissante ; réservoir externe (ET) 26,5 t à vide + 733 t d'ergols ; 3 moteurs principaux SSME à 104,5 % (≈ 2,28 MN dans le vide chacun, Isp 452 s dans le vide, 366 s au niveau de la mer), étranglés sous la pression
// dynamique maximale (≈ 70 %) puis en fin de vol (limite de 3 g) ; arrêt MECO vers T+8:30, séparation du réservoir 18 s plus tard ; orbiteur ≈ 110 t avec deux moteurs OMS (2 × 26,7 kN, Isp 316 s) qui circularisent à l'apogée.
// « Pas sur l'ISS, juste une trajectoire quelconque à l'altitude » (demande de l'utilisateur) : plein est depuis le pas de tir 39A, orbite visée ≈ 215 × 225 km.
// Les modèles 3D (NASA) sont dans le même dossier. node tools/make-shuttle.js puis node tools/make-objects.js
const fs = require('fs'), vm = require('vm'), path = require('path'), root = path.join(__dirname, '..'), out = path.join(root, 'public', 'objects', 'shuttle'), ctx = { console, Math, Date, JSON }; vm.createContext(ctx);
require('./lib-engine').loadEngineIntoSync(ctx);
const G0 = 9.80665, r1 = (x, n) => Math.round(x * (n || 10)) / (n || 10);
const SRB = { n: 2, dry: 87000, prop: 503000, burn: 124, ispV: 268, ispS: 242 }, ET = { dry: 26500, resid: 2000, prop: 733000 }, ORBITER = 110000;
const SSME = { n: 3, thrustV: 2279e3, ispV: 452.3, ispS: 366 }, SSME_FLOW = SSME.n * SSME.thrustV / (SSME.ispV * G0), OMS = { thrust: 53400, isp: 316 }, OMS_FLOW = OMS.thrust / (OMS.isp * G0), CDA = 60;
const m0 = SRB.n * (SRB.dry + SRB.prop) + ET.dry + ET.prop + ORBITER, srbFlow = t => SRB.n * SRB.prop / SRB.burn * (1.31 - 0.62 * t / SRB.burn);   // profil de poussée des SRB : forte au départ puis décroissante (intégrale = 1)
// instant MECO : quand les moteurs principaux ont brûlé les ergols du réservoir (moins le résidu)
const ssme = (t, tm) => SSME_FLOW * (t < 30 ? 1 : t < 62 ? 0.70 / 1.045 : t < 400 ? 1 : 1 - 0.36 * (t - 400) / Math.max(1, tm - 400));
let tMeco = 500; for (let k = 0; k < 20; k++) { let c = 0; for (let t = 0; t < tMeco; t += 0.05) c += ssme(t + 0.025, tMeco) * 0.05; tMeco += (ET.prop - ET.resid - c) / ssme(tMeco, tMeco) * 0.8; }
tMeco = r1(tMeco, 10); const tNat = tMeco;
const consumedTo = tc => { let c = 0; for (let t = 0; t < tc; t += 0.05) c += ssme(t + 0.025, tc) * 0.05; return c; };   // ergols brûlés par les 3 SSME jusqu'à l'arrêt tc (avec l'étranglement)
const parts = {
  srb: { name: 'Booster à poudre (SRB)', role: 'booster', massKg: SRB.dry, residualPropKg: 0, visual: { radiusM: 1.85, lengthM: 45.2, noseM: 0, nozzleM: 0, color: '#f2f2f2', bandColor: '#f2f2f2', model: { file: 'solid-rocket-booster.glb', scale: 0.0254, rotate: [0, 0, 90], align: ['center', 'min', 'center'] } }, dragCoefficient: 1, separationSpeedMs: -2, disintegrates: false },
  et: { name: 'Réservoir externe (ET)', role: 'stage', massKg: ET.dry, residualPropKg: ET.resid, visual: { radiusM: 4.2, lengthM: 47.7, nozzleM: 0, color: '#d8883a', model: { file: 'external-tank.glb', scale: 0.0254, rotate: [0, 0, 90], align: ['center', 'min', 'center'] } }, dragCoefficient: 1, separationSpeedMs: -1, disintegrates: true, disintegrationAltitudeKm: 80 },
};
// paliers : débit et Isp effectifs des moteurs allumés, au milieu de chaque intervalle de 2 s pendant les boosters
const build = (knots, oms, cut) => {
  cut = cut || tNat; const tMeco = r1(cut, 10), tl = [], tEt = r1(tMeco + 18, 10), STEP = 2; parts.et.residualPropKg = Math.round(ET.prop - consumedTo(tMeco));   // le reste d'ergols part avec le réservoir (masse exacte)
  for (let a = 0; a < SRB.burn - 1e-6; a += STEP) {
    const mid = a + STEP / 2, s = srbFlow(mid), e = ssme(mid, tMeco), md = s + e, entry = { t: a, burnKgS: r1(md, 10), ispVac: r1((s * SRB.ispV + e * SSME.ispV) / md, 10), ispSea: r1((s * SRB.ispS + e * SSME.ispS) / md, 10) };
    if (a === 0) Object.assign(entry, { massKg: m0, cdA: CDA, flames: ['eap', 'epc'], label: 'Décollage', key: 't0' });
    tl.push(entry);
  }
  tl.push({ t: SRB.burn, release: [{ part: 'srb', count: SRB.n }], burnKgS: r1(ssme(SRB.burn, tMeco), 10), ispVac: SSME.ispV, ispSea: SSME.ispS, flames: ['epc'], label: 'Séparation des boosters à poudre (SRB)' });
  for (let a = 400; a < tMeco - 1e-6; a += 10) { const b = Math.min(a + 10, tMeco); tl.push({ t: a, burnKgS: r1(ssme((a + b) / 2, tMeco), 10) }); }
  tl.push({ t: tMeco, burnKgS: 0, flames: [], label: 'Arrêt des moteurs principaux (MECO)', key: 'meco' });
  tl.push({ t: tEt, release: [{ part: 'et', count: 1 }], label: 'Séparation du réservoir externe' });
  if (oms) { tl.push({ t: r1(oms.ti, 10), burnKgS: r1(OMS_FLOW, 100), ispVac: OMS.isp, ispSea: OMS.isp, flames: ['esc'], label: 'Allumage OMS-2 à l’apogée (circularisation)', key: 'esc2', phase: 'circularisation' }); tl.push({ t: r1(oms.ti + oms.dur, 10), burnKgS: 0, flames: [], label: 'Extinction OMS-2 : orbite atteinte', key: 'esc2end', phase: 'en orbite' }); }
  const T = [0, 7, 20, 40, 70, 124, 200, 300, 400, tMeco];   // programme de tangage : angle au-dessus de l'horizontale aux dates de T
  for (let i = 0; i < T.length; i++) tl.push({ t: T[i], pitch: r1(knots[i], 100) });
  return tl.sort((a, b) => a.t - b.t);
};
const START = { lat: 28.609, lon: -80.6048, altitudeKm: 0, azimuthDeg: 90, elevationDeg: 90, speedMs: 0 };   // pas de tir 39A (Cap Canaveral), plein est
const fly = (knots, oms, cut) => { ctx.TRY = { name: 'x', start: START, parts, timeline: build(knots, oms, cut) }; return vm.runInContext('flyObject(TRY)', ctx); };
// phase 1 : programme de tangage pour que l'état à la séparation du réservoir donne apogée ≈ 225 km, périgée ≈ 60 km (le réservoir rentre ; l'orbiteur circularise ensuite)
const stateAtEt = (r, cut) => { const t = (cut || tNat) + 18, s = r.samples.find(q => q.t >= t - 1e-6) || r.samples[r.samples.length - 1]; ctx.S = s; return vm.runInContext('lchElements(Math.hypot(S.x, S.y), (S.vx * S.x + S.vy * S.y) / Math.hypot(S.x, S.y), (S.vy * S.x - S.vx * S.y) / Math.hypot(S.x, S.y))', ctx); };
const loss1 = (k, cut) => { const r = fly(k, null, cut), o = stateAtEt(r, cut), rp = (o.rp - 6378137) / 1000, ra = (o.ra - 6378137) / 1000; return Math.abs(ra - 225) + 0.6 * Math.abs(rp - 60) + (rp < -200 ? 500 : 0); };
let best = [90, 90, 76, 64, 53, 40, 29, 19, 10, 1], bcut = tNat - 8, bl = loss1(best, bcut), seed = 7; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 - 0.5; };
for (let it = 0; it < 2400 && bl > 1; it++) { const sig = it < 800 ? 4 : it < 1600 ? 1.5 : 0.5, k = best.slice(); for (let i = 2; i < k.length; i++) if (rnd() > -0.1) k[i] += rnd() * 2 * sig; for (let i = 3; i < k.length; i++) k[i] = Math.min(k[i], k[i - 1]); const c = Math.max(420, Math.min(tNat, bcut + rnd() * 2 * sig * 2)), l = loss1(k, c); if (l < bl) { bl = l; best = k; bcut = c; } }
const o1 = stateAtEt(fly(best, null, bcut), bcut); console.log('programme de tangage réglé : arrêt des moteurs principaux T+' + r1(bcut, 10) + ' s (naturel : T+' + tNat + '), à la séparation du réservoir orbite ' + r1((o1.rp - 6378137) / 1000, 1) + ' x ' + r1((o1.ra - 6378137) / 1000, 1) + ' km (erreur ' + bl.toFixed(1) + ' km), ergols restants dans le réservoir ' + Math.round(ET.prop - consumedTo(r1(bcut, 10))) + ' kg');
// phase 2 : allumage des OMS à l'apogée et durée de poussée pour circulariser (≈ 215 x 225 km)
const r0 = fly(best, null, bcut); let ia = 0; for (let i = 0; i < r0.samples.length; i++) if (r0.samples[i].alt > r0.samples[ia].alt) ia = i; const tApo = r0.samples[ia].t;
let b2 = null; for (let dur = 60; dur <= 420; dur += 10) for (let dt = -dur / 2 - 20; dt <= -dur / 2 + 20; dt += 5) { const r = fly(best, { ti: tApo + dt, dur }, bcut); if (!r.ok) continue; const e = Math.abs((r.orbit.rp - 6378137) / 1000 - 215) + Math.abs((r.orbit.ra - 6378137) / 1000 - 225); if (!b2 || e < b2.e) b2 = { e, ti: tApo + dt, dur }; }
if (!b2) { console.log('ÉCHEC : aucune circularisation trouvée'); process.exit(1); }
for (let it = 0; it < 120; it++) { const c = { ti: b2.ti + rnd() * 4, dur: b2.dur + rnd() * 3 }, r = fly(best, c, bcut); if (!r.ok) continue; const e = Math.abs((r.orbit.rp - 6378137) / 1000 - 215) + Math.abs((r.orbit.ra - 6378137) / 1000 - 225); if (e < b2.e) b2 = { e, ti: c.ti, dur: c.dur }; }
const timeline = build(best, b2, bcut), res = fly(best, b2, bcut);
console.log('circularisation : allumage T+' + r1(b2.ti, 10) + ', durée ' + r1(b2.dur, 10) + ' s → orbite ' + Math.round((res.orbit.rp - 6378137) / 1000) + ' x ' + Math.round((res.orbit.ra - 6378137) / 1000) + ' km, ok ' + res.ok + ', ' + timeline.length + ' paliers');
const main = {
  name: 'Navette spatiale (STS) — orbite basse',
  start: START,
  visual: { name: 'Navette spatiale (STS)', short: 'Navette', stack: { core: 'et', boosters: { part: 'srb', count: SRB.n, radialM: 7.3 }, heightM: 47.7,
    upper: { name: 'Orbiteur', radiusM: 3, lengthM: 37.2, stackHeightM: 0.01, color: '#f0f0f0', nozzleM: 0, model: { file: 'orbiter.glb', scale: 0.89, rotate: [90, 0, -90], align: ['min', 'min', 'center'], offsetM: [5, -1, 0] } },
    flames: { core: { xM: 10, yM: -1, zM: 0, radiusM: 1.7, lengthM: 32 }, upper: { xM: 10, yM: -1, zM: 0, radiusM: 0.5, lengthM: 6 } } } },
  parts: { srb: 'srb.json', et: 'et.json' },
  timeline,
};
const NL = String.fromCharCode(10), fmt = o => JSON.stringify(o, null, 2).replace(/\{\n\s+"t": ([\s\S]*?)\n\s+\}(?=,?\n\s+[\{\]])/g, m => m.replace(/\n\s+/g, ' ')).replace(/\[\n\s+("[^"]*"[^\]]*?)\n\s+\]/g, m => m.replace(/\n\s+/g, ' '));
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'shuttle.json'), fmt(main) + NL);
for (const [k, v] of Object.entries(parts)) fs.writeFileSync(path.join(out, k + '.json'), JSON.stringify(v, null, 2) + NL);
const mass = t => res.samples.find(s => s.t >= t).m, ev = k => res.events.find(e => e.key === k);
console.log('masse : ' + Math.round(m0) + ' kg au décollage, ' + Math.round(mass(120)) + ' à T+120, ' + Math.round(mass(130)) + ' après les boosters, ' + Math.round(mass(bcut + 5)) + ' au MECO ; événements : ' + res.events.map(e => e.key + '@' + e.t.toFixed(0)).join(' '));
let gmax = 0, tg = 0; for (const s of res.samples) if (s.acc > gmax) { gmax = s.acc; tg = s.t; } console.log('accélération max ' + gmax.toFixed(2) + ' g à T+' + tg.toFixed(0) + ' s ; pression dynamique max ' + (res.maxQ.q / 1000).toFixed(1) + ' kPa à T+' + res.maxQ.t.toFixed(0) + ' s ; jettison : ' + Object.keys(res.plan.jettison).join(', '));
