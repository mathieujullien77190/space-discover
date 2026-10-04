// Fabrique objects/voyager/ : lancement d'une sonde Voyager (1977) par un Titan IIIE-Centaur depuis le pas de tir 41 de Cap Canaveral, plein est, jusqu'à une trajectoire de LIBÉRATION (la sonde quitte la Terre).
// ⚠ Valeurs de MÉMOIRE (ordres de grandeur, à vérifier avant de les citer) : masse au décollage ≈ 626 t ; 2 boosters à poudre UA1205 (33 t à vide, 193 t de poudre, 115 s) ; étage principal LR87 (6 t + 113 t, 147 s, Isp 302 s dans le vide) allumé
// vers T+105 s ; 2e étage LR91 (4,3 t + 29,7 t, 207 s, Isp 316 s) ; Centaur D-1T (2,7 t + 13,2 t d'hydrogène-oxygène, 2 RL10 : 133 kN, Isp 444 s) qui fait deux poussées (orbite de parking puis injection) ; sonde Voyager 825 kg + moteur à poudre
// Star-37E (≈ 1,07 t dont 1,01 t de poudre, 68 kN, Isp 289 s, 42 s). Les durées des poussées du Centaur et le programme de tangage sont RÉGLÉS PAR RECHERCHE pour viser l'orbite de parking (≈ 165 × 185 km) puis une énergie de libération C3 ≈ 102 km²/s²
// (Voyager 2). Lune et Soleil attirent la sonde (js/ephemeris.js) ; les autres planètes ne sont pas simulées (pas d'assistance gravitationnelle). node tools/make-voyager.js puis node tools/make-objects.js
const fs = require('fs'), vm = require('vm'), path = require('path'), root = path.join(__dirname, '..'), out = path.join(root, 'objects', 'voyager'), ctx = { console, Math, Date, JSON }; vm.createContext(ctx);
for (const f of ['js/physics.js', 'js/launch.js', 'js/ephemeris.js', 'js/flight-object.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const G0 = 9.80665, MU = 3.986004418e14, RE = 6378137, r1 = (x, n) => Math.round(x * (n || 10)) / (n || 10);
const TF = +process.env.TITAN_F || 1.05;   // facteur de rendement (Isp) des étages Titan : réglé (1,05) pour que la sonde atteigne C3 ≈ 102 km²/s² en consommant presque tous les ergols du Centaur ; les Isp de mémoire sont un peu trop faibles
const SRM = { n: 2, dry: 33000, prop: 193000, burn: 115, ispV: 263 * TF, ispS: 236 * TF }, T1 = { dry: 6000, prop: 113000, burn: 147, ispV: 302 * TF, ispS: 259 * TF, ign: 105 }, T2 = { dry: 4300, prop: 29700, burn: 207, isp: 316 * TF, ign: 255 };
const CEN = { dry: 2700, prop: 13200, thrust: 133.4e3, isp: 444 }, CEN_FLOW = CEN.thrust / (CEN.isp * G0), STAR = { loaded: 1070, prop: 1010, burn: 42, isp: 289 }, VOY = 825, FAIR = 1250, MISC = 600, CDA = 14;
const m0 = SRM.n * (SRM.dry + SRM.prop) + T1.dry + T1.prop + T2.dry + T2.prop + CEN.dry + CEN.prop + MISC + 2 * FAIR + STAR.loaded + VOY;
const srmFlow = t => SRM.n * SRM.prop / SRM.burn * (1.31 - 0.62 * t / SRM.burn), t1Flow = T1.prop / T1.burn, t2Flow = T2.prop / (T2.burn), starFlow = STAR.prop / STAR.burn;
const parts = {
  srm: { name: 'Booster à poudre (UA1205)', role: 'booster', massKg: SRM.dry, residualPropKg: 0, visual: { radiusM: 1.52, lengthM: 24.5, noseM: 1.4, nozzleM: 0, color: '#f2f2f2', bandColor: '#c83030' }, dragCoefficient: 1, separationSpeedMs: -2, disintegrates: false },
  titan1: { name: 'Étage principal Titan (LR87)', role: 'stage', massKg: T1.dry, residualPropKg: 0, visual: { radiusM: 1.52, lengthM: 21.3, nozzleM: 1, color: '#e4dfd2' }, dragCoefficient: 1, separationSpeedMs: -1, disintegrates: false },
  titan2: { name: 'Deuxième étage Titan (LR91)', role: 'stage2', massKg: T2.dry, residualPropKg: 0 },
  centaur: { name: 'Étage Centaur D-1T', role: 'upperstage', massKg: CEN.dry + MISC, residualPropKg: 0 },
  fairing: { name: 'Coiffe Centaur (moitié)', role: 'fairing', massKg: FAIR, residualPropKg: 0, visual: { radiusM: 2.15, cylM: 11.8, coneM: 5.2, color: '#f2f2f2' }, dragCoefficient: 1, separationSpeedMs: 0.4, disintegrates: false },
  probe: { name: 'Sonde Voyager', role: 'payload', massKg: VOY, visual: { radiusM: 1.8, lengthM: 2 }, separationSpeedMs: 0.5 },
};
const tl0 = Math.round(1e9 / 1e6);   // (pour mémoire : la libération est suivie jusqu'à 10⁹ m)
// paliers : débit et Isp effectifs des moteurs allumés
const build = (knots, d1, c, d2) => {
  const tl = [], STEP = 2, tC1 = 470, e1 = tC1 + d1, tC2 = e1 + c, e2 = tC2 + d2, tStar = e2 + 125;
  parts.centaur.residualPropKg = Math.round(CEN.prop - CEN_FLOW * (d1 + d2));
  const bps = []; for (let a = 0; a < T1.ign - 1e-6; a += STEP) bps.push(a); for (let a = T1.ign; a < SRM.burn - 1e-6; a += STEP) bps.push(a); bps.push(SRM.burn);   // 0, 2, … 104, 105 (allumage du 1er étage), 107, … 113, 115
  for (let ib = 0; ib < bps.length - 1; ib++) {
    const a = bps[ib], b = bps[ib + 1], mid = (a + b) / 2, s = srmFlow(mid), c1 = mid >= T1.ign ? t1Flow : 0, md = s + c1, entry = { t: a, burnKgS: r1(md, 10), ispVac: r1((s * SRM.ispV + c1 * T1.ispV) / md, 10), ispSea: r1((s * SRM.ispS + c1 * T1.ispS) / md, 10), flames: c1 ? ['eap', 'epc'] : ['eap'] };
    if (a === 0) Object.assign(entry, { massKg: m0, cdA: CDA, label: 'Décollage', key: 't0' });
    tl.push(entry);
  }
  tl.push({ t: SRM.burn, burnKgS: r1(t1Flow, 10), ispVac: T1.ispV, ispSea: T1.ispS, flames: ['epc'] });
  tl.push({ t: 120, release: [{ part: 'srm', count: SRM.n }], label: 'Séparation des boosters à poudre' });
  tl.push({ t: 225, release: [{ part: 'fairing', count: 2 }], label: 'Largage de la coiffe' });
  tl.push({ t: T1.ign + T1.burn, burnKgS: 0, flames: [], label: 'Fin de poussée du 1er étage' });
  tl.push({ t: T1.ign + T1.burn + 2, release: [{ part: 'titan1', count: 1 }], label: 'Séparation du 1er étage Titan' });
  tl.push({ t: T2.ign, burnKgS: r1(t2Flow, 10), ispVac: T2.isp, ispSea: T2.isp, flames: ['esc'], label: 'Allumage du 2e étage' });
  tl.push({ t: T2.ign + T2.burn, burnKgS: 0, flames: [], label: 'Fin de poussée du 2e étage' });
  tl.push({ t: T2.ign + T2.burn + 2, release: [{ part: 'titan2', count: 1 }], label: 'Séparation du 2e étage Titan' });
  tl.push({ t: tC1, burnKgS: r1(CEN_FLOW, 100), ispVac: CEN.isp, ispSea: CEN.isp, flames: ['esc'], pitch: 'prograde', label: 'Allumage du Centaur (1re poussée)', key: 'esc1' });
  tl.push({ t: r1(e1, 10), burnKgS: 0, flames: [], label: 'Orbite de parking atteinte', key: 'esc1end' });
  tl.push({ t: r1(tC2, 10), burnKgS: r1(CEN_FLOW, 100), flames: ['esc'], pitch: 'prograde', label: 'Allumage du Centaur (injection vers Jupiter)', key: 'esc2' });
  tl.push({ t: r1(e2, 10), burnKgS: 0, flames: [], label: 'Fin de poussée du Centaur', key: 'esc2end' });
  tl.push({ t: r1(e2 + 5, 10), release: [{ part: 'centaur', count: 1 }], label: 'Séparation du Centaur' });
  tl.push({ t: r1(tStar, 10), burnKgS: r1(starFlow, 100), ispVac: STAR.isp, ispSea: STAR.isp, flames: ['esc'], pitch: 'prograde', label: 'Allumage du moteur Star-37E' });
  tl.push({ t: r1(tStar + STAR.burn, 10), burnKgS: 0, flames: [], label: 'Fin du moteur Star-37E' });
  tl.push({ t: r1(tStar + STAR.burn + 3, 10), release: [{ part: 'probe', count: 1 }], label: 'Voyager se sépare du moteur', phase: 'en route' });
  const T = [0, 7, 20, 40, 70, 105, 150, 200, 255, 330, 400, 462];   // programme de tangage des étages Titan (degrés au-dessus de l'horizontale) ; ensuite la poussée suit la vitesse
  for (let i = 0; i < T.length; i++) tl.push({ t: T[i], pitch: r1(knots[i], 100) });
  return tl.sort((a, b) => a.t - b.t || (typeof a.pitch === 'number' ? -1 : 0));
};
const START = { lat: 28.583, lon: -80.583, altitudeKm: 0, azimuthDeg: 90, elevationDeg: 90, speedMs: 0 };   // pas de tir 41 (Cap Canaveral), plein est
const fly = (k, d1, c, d2) => { ctx.TRY = { name: 'x', start: START, parts, maxDurationS: 200000, timeline: build(k, d1, c, d2) }; return vm.runInContext('flyObject(TRY)', ctx); };
const orbitAt = (r, t) => { const s = r.samples.find(q => q.t >= t - 1e-6) || r.samples[r.samples.length - 1]; ctx.S = s; return vm.runInContext('lchElements(Math.hypot(S.x, S.y), (S.vx * S.x + S.vy * S.y) / Math.hypot(S.x, S.y), (S.vy * S.x - S.vx * S.y) / Math.hypot(S.x, S.y))', ctx); };
// phase A : programme de tangage + durée de la 1re poussée du Centaur → orbite de parking 165 x 185 km
const lossA = (k, d1) => { const r = fly(k, d1, 600, 60), o = orbitAt(r, 470 + d1), rp = (o.rp - RE) / 1000, ra = (o.ra - RE) / 1000; return Math.abs(rp - 165) + Math.abs(ra - 185) + (rp < -300 ? 800 : 0); };
let best = [90, 90, 76, 62, 50, 42, 34, 27, 20, 12, 6, 2], bd1 = 250, bl = lossA(best, bd1), seed = 11; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 - 0.5; };
for (let it = 0; it < 2600 && bl > 1.5; it++) { const sig = it < 900 ? 4 : it < 1800 ? 1.5 : 0.5, k = best.slice(); for (let i = 2; i < k.length; i++) if (rnd() > -0.1) k[i] += rnd() * 2 * sig; for (let i = 3; i < k.length; i++) k[i] = Math.min(k[i], k[i - 1]); const d1 = Math.max(15, bd1 + rnd() * 2 * sig * 6), l = lossA(k, d1); if (l < bl) { bl = l; best = k; bd1 = d1; } }
const oA = orbitAt(fly(best, bd1, 600, 60), 470 + bd1); console.log('phase A : 1re poussée du Centaur ' + r1(bd1, 10) + ' s → orbite de parking ' + Math.round((oA.rp - RE) / 1000) + ' x ' + Math.round((oA.ra - RE) / 1000) + ' km (erreur ' + bl.toFixed(1) + ' km), ergols du Centaur utilisés : ' + Math.round(CEN_FLOW * bd1) + ' kg sur ' + CEN.prop);
// phase B : instant de la 2e poussée (coast après la 1re : allumage au périgée = meilleur rendement) puis durée de la 2e poussée pour C3 ≈ 102 km²/s²
let bc = 600, bestC3 = -1e9; const dmax = (CEN.prop - 80) / CEN_FLOW - bd1, c3 = (c, d2) => { const r = fly(best, bd1, c, d2); return r.c3 / 1e6; };
for (const c of [30, 60, 120, 200, 300, 450, 600, 900, 1300, 1800, 2400, 3000, 3600, 4200, 4800]) { const v = c3(c, dmax); if (process.env.DEBUG) console.log('  coast ' + c + ' s, poussée 2 de ' + Math.round(dmax) + ' s → C3 ' + v.toFixed(1)); if (v > bestC3) { bestC3 = v; bc = c; } }
for (let it = 0; it < 14; it++) { for (const dc of [-30, 30]) { const v = c3(bc + dc, dmax); if (v > bestC3) { bestC3 = v; bc += dc; } } }
let lo = 20, hi = dmax; if (bestC3 < 102) console.log('⚠ même avec tout le Centaur et le meilleur instant (coast ' + bc + ' s), C3 = ' + bestC3.toFixed(1) + ' km²/s² < 102'); else for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (c3(bc, mid) < 102) lo = mid; else hi = mid; }
const d2 = bestC3 < 102 ? r1(dmax, 10) : r1((lo + hi) / 2, 10), res = fly(best, bd1, bc, d2), timeline = build(best, bd1, bc, d2);
console.log('phase B : coast ' + bc + ' s puis 2e poussée du Centaur ' + d2 + ' s (max ' + Math.round(dmax) + ' s), ergols restants ' + parts.centaur.residualPropKg + ' kg → ' + res.message);
const main = {
  name: 'Voyager 2 — Titan IIIE-Centaur, trajectoire de libération',
  maxDurationS: 200000, escapeDistanceM: 1e9,
  start: START,
  visual: { name: 'Titan IIIE-Centaur', short: 'Titan IIIE', stack: { core: 'titan1', boosters: { part: 'srm', count: SRM.n, radialM: 3.3 }, heightM: 48.5, fairingBaseM: 31.2, payloadName: 'Sonde Voyager',
    upper: { name: 'Étage Titan 2 + Centaur', radiusM: 1.52, lengthM: 19.5, color: '#d4d4d8', nozzleM: 0.8 }, fairing: 'fairing', fairingPieces: 2 } },
  parts: { srm: 'srm.json', titan1: 'titan1.json', titan2: 'titan2.json', centaur: 'centaur.json', fairing: 'fairing.json', probe: 'probe.json' },
  timeline,
};
const NL = String.fromCharCode(10), fmt = o => JSON.stringify(o, null, 2).replace(/\{\n\s+"t": ([\s\S]*?)\n\s+\}(?=,?\n\s+[\{\]])/g, m => m.replace(/\n\s+/g, ' ')).replace(/\[\n\s+("[^"]*"[^\]]*?)\n\s+\]/g, m => m.replace(/\n\s+/g, ' '));
fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, 'voyager.json'), fmt(main) + NL);
for (const [k, v] of Object.entries(parts)) fs.writeFileSync(path.join(out, k + '.json'), JSON.stringify(v, null, 2) + NL);
const mass = t => res.samples.find(s => s.t >= t).m; let gmax = 0, tg = 0; for (const s of res.samples) if (s.acc > gmax) { gmax = s.acc; tg = s.t; }
console.log('masse au décollage ' + Math.round(m0) + ' kg, T+60 ' + Math.round(mass(60)) + ', après les boosters ' + Math.round(mass(125)) + ', après le 2e étage ' + Math.round(mass(470)) + ', finale ' + Math.round(res.samples[res.samples.length - 1].m) + ' kg ; poussée/poids au départ ' + (res.samples[1].F / (res.samples[1].m * G0)).toFixed(2) + ' ; accélération max ' + gmax.toFixed(2) + ' g à T+' + tg.toFixed(0) + ' s ; pression dynamique max ' + (res.maxQ.q / 1000).toFixed(1) + ' kPa');
console.log('bilan de masse : à T+470 ' + Math.round(mass(470)) + ' kg (attendu ' + (CEN.dry + CEN.prop + MISC + STAR.loaded + VOY) + '), finale ' + Math.round(res.samples[res.samples.length - 1].m) + ' kg (attendu ' + (STAR.loaded - STAR.prop) + ' : le boîtier du Star-37E)');
console.log('événements : ' + res.events.map(e => e.key + '@' + e.t.toFixed(0)).join(' ') + ' ; échantillons ' + res.samples.length + ', ' + timeline.length + ' paliers');
