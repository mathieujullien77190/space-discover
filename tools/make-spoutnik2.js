// Fabrique public/objects/spoutnik2/ : SPOUTNIK 2 (3 novembre 1957, Laïka) lancé par une R-7 « Semiorka » (8K71PS) depuis le pas de tir n° 1 de Tiouratam (futur Baïkonour), même fusée et même pas de tir que Spoutnik 1.
// ⚠ Valeurs de MÉMOIRE, à vérifier (sources visées : NASA / NSSDC, entrée « Sputnik 2 ») : orbite 212 × 1 660 km, inclinaison 65,3°, période 103,7 min, masse du satellite 508 kg (capsule conique de ≈ 4 m de haut, Laïka à bord) ;
// R-7 8K71PS : 4 boosters latéraux (blocs B, V, G, D, ≈ 3,45 t à vide et 39,8 t d'ergols chacun, 120 s) + bloc central (bloc A, ≈ 7,5 t à vide, ≈ 295-310 s), masses et Isp du fichier src/engine/rockets.js (R-7 de Spoutnik 1, ajustées pour retrouver l'orbite réelle).
// PARTICULARITÉ : le satellite RESTE ATTACHÉ à l'étage central (pas de séparation) : aucune pièce « payload » n'est larguée. Plein nord-est (azimut ≈ 37° : sin A = cos i / cos(latitude) pour i = 65,3°).
// Ce que fait l'outil : fixe les masses, le débit des moteurs et le pas de tir, puis RÈGLE PAR RECHERCHE le programme de tangage (10 points) et l'instant d'arrêt du moteur central pour atteindre l'orbite visée.
// Usage : node tools/make-spoutnik2.js puis node tools/make-objects.js
const fs = require('fs'), vm = require('vm'), path = require('path'), root = path.join(__dirname, '..'), out = path.join(root, 'public', 'objects', 'spoutnik2'), ctx = { console, Math, Date, JSON }; vm.createContext(ctx);
require('./lib-engine').loadEngineIntoSync(ctx);
const G0 = 9.80665, r1 = (x, n) => Math.round(x * (n || 10)) / (n || 10), RE = 6378137;
const TARGET = { rp: 212, ra: 1660, incDeg: 65.3 }, SITE = { lat: 45.92, lon: 63.3422 };   // pas de tir n° 1 de Tiouratam (Baïkonour) : comme Spoutnik 1
const AZ = r1(Math.asin(Math.cos(TARGET.incDeg * Math.PI / 180) / Math.cos(SITE.lat * Math.PI / 180)) * 180 / Math.PI, 100);   // azimut du tir (° depuis le nord)
const B = { n: 4, dry: 3450, prop: 39800, burn: 120, ispV: 313, ispS: 252 }, CORE = { dry: 7500, flow: 94250 / 295, ispV: 316, ispS: 241 }, SAT = 508.3, SEP = 116, CDA = 10;
const CORE_MAX_BURN = 322;   // au plus ≈ 9 % d'ergols de plus que le bloc central de Spoutnik 1 (94,25 t, 295 s) : le vol de Spoutnik 1 avait une coupure précoce du moteur central, celui de Spoutnik 2 a dépassé 1 000 km d'apogée
const FB = B.prop / B.burn;   // débit d'un booster (kg/s)
const m0 = tc => B.n * (B.dry + B.prop) + CORE.dry + CORE.flow * tc + 150 + SAT;   // 150 kg d'ergols de réserve dans le bloc central
const parts = {
  booster: { name: 'Booster latéral (blocs B, V, G, D)', role: 'booster', massKg: B.dry, residualPropKg: Math.round(B.prop - FB * SEP), visual: { radiusM: 1.3, lengthM: 19, noseM: 3, nozzleM: 1.6, color: '#cfc8b8', bandColor: '#b8b0a0' }, dragCoefficient: 1, separationSpeedMs: -1.5, disintegrates: false },
  core: { name: 'Bloc central (bloc A) + Spoutnik 2', role: 'stage', massKg: CORE.dry + SAT, residualPropKg: 150, visual: { radiusM: 1.45, lengthM: 26.5, nozzleM: 2, color: '#cfc8b8' }, dragCoefficient: 1, separationSpeedMs: 0, disintegrates: false },
};
const build = (knots, tc) => {
  const tl = [], STEP = 2;
  for (let a = 0; a < SEP - 1e-6; a += STEP) {
    const f = B.n * FB + CORE.flow, entry = { t: a, burnKgS: r1(f, 10), ispVac: r1((B.n * FB * B.ispV + CORE.flow * CORE.ispV) / f, 10), ispSea: r1((B.n * FB * B.ispS + CORE.flow * CORE.ispS) / f, 10) };
    if (a === 0) Object.assign(entry, { massKg: Math.round(m0(tc)), cdA: CDA, flames: ['eap', 'epc'], label: 'Décollage', key: 't0' });
    tl.push(entry);
  }
  tl.push({ t: SEP, release: [{ part: 'booster', count: B.n }], burnKgS: r1(CORE.flow, 10), ispVac: CORE.ispV, ispSea: CORE.ispS, flames: ['epc'], label: 'Séparation des 4 boosters latéraux', key: 'eap' });
  tl.push({ t: r1(tc, 10), burnKgS: 0, flames: [], label: 'Arrêt du moteur central : Spoutnik 2 reste attaché au bloc central', key: 'meco' });
  const T = [0, 8, 20, 40, 70, SEP, 180, 240, tc];   // programme de tangage : angle au-dessus de l'horizontale aux dates de T
  for (let i = 0; i < T.length; i++) tl.push({ t: r1(T[i], 10), pitch: r1(knots[i], 100) });
  return tl.sort((a, b) => a.t - b.t);
};
const START = { lat: SITE.lat, lon: SITE.lon, altitudeKm: 0, azimuthDeg: AZ, elevationDeg: 90, speedMs: 0 };
const fly = (knots, tc) => { ctx.TRY = { name: 'x', start: START, parts, timeline: build(knots, tc) }; return vm.runInContext('flyObject(TRY)', ctx); };
// éléments de l'orbite à l'instant t (position et vitesse inertielles de l'échantillon) : continue même quand le vol n'atteint pas l'orbite (périgée sous terre) → la recherche a un gradient
const elemsAt = (r, t) => { const q = r.samples.find(z => z.t >= t - 1e-6) || r.samples[r.samples.length - 1]; ctx.S = q; return vm.runInContext('lchElements(Math.hypot(S.x, S.y), (S.vx * S.x + S.vy * S.y) / Math.hypot(S.x, S.y), (S.vy * S.x - S.vx * S.y) / Math.hypot(S.x, S.y))', ctx); };
const orb = (r, tc) => { const o = elemsAt(r, (tc || 0) + 1); return [Math.max(-6300, (o.rp - RE) / 1000), Math.min(20000, (o.ra - RE) / 1000)]; };
// rugosité : changements de pente du programme de tangage (un virage gravitationnel lisse, pas de à-coups) ; le dernier point est contraint à 0° (horizontal) ou au-dessus
const rough = (k, tc) => { const T = [0, 8, 20, 40, 70, SEP, 180, 240, tc]; let sum = 0, prev = null; for (let i = 1; i < k.length; i++) { const sl = (k[i] - k[i - 1]) / Math.max(1, T[i] - T[i - 1]); if (prev !== null) sum += Math.pow(sl - prev, 2); prev = sl; } return sum; };
const loss = (k, tc) => { const r = fly(k, tc), [rp, ra] = orb(r, tc); return Math.abs(rp - TARGET.rp) + 0.35 * Math.abs(ra - TARGET.ra) + 4 * rough(k, tc) + (k[k.length - 1] < 0 ? 50 : 0); };
const err0 = l => l;   // (la rugosité fait partie de la perte : on cherche jusqu'au bout)
let best = [90, 90, 84, 70, 54, 40, 22, 10, 2], bt = 298, bl = loss(best, bt), seed = 11; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 - 0.5; };
for (let it = 0; it < 6000 && err0(bl) > 1.5; it++) {
  const sig = it < 1500 ? 4 : it < 3000 ? 1.5 : 0.5, k = best.slice();
  for (let i = 2; i < k.length; i++) if (rnd() > -0.1) k[i] += rnd() * 2 * sig; for (let i = 2; i < k.length; i++) k[i] = Math.max(0, Math.min(k[i], k[i - 1], 90));   // tangage décroissant, jamais au-delà de la verticale
  const tc = Math.max(285, Math.min(CORE_MAX_BURN, bt + rnd() * 2 * sig * 1.5)); 
  const l = loss(k, tc); if (l < bl) { bl = l; best = k; bt = tc; }
}
const res = fly(best, bt), [rp, ra] = orb(res, bt), err = Math.abs(rp - TARGET.rp) + 0.35 * Math.abs(ra - TARGET.ra);
console.log('AZIMUT du tir : ' + AZ + '° ; programme de tangage : ' + best.map(v => r1(v, 10)).join(', ') + ' ; arrêt du moteur central T+' + r1(bt, 10) + ' s (poussée jusqu\'à épuisement : ' + Math.round(CORE.flow * bt) + ' kg d\'ergols) → orbite ' + Math.round(rp) + ' × ' + Math.round(ra) + ' km (visée ' + TARGET.rp + ' × ' + TARGET.ra + '), ok ' + res.ok + ' (erreur sur l’orbite ' + err.toFixed(1) + ', rugosité du tangage ' + rough(best, bt).toFixed(3) + ')');
if (!res.ok) { console.log('ÉCHEC : orbite non atteinte'); process.exit(1); }
const main = {
  name: 'Spoutnik 2 (R-7, 3 novembre 1957)',
  start: START,
  visual: { name: 'R-7 + Spoutnik 2', short: 'Spoutnik 2', stack: { core: 'core', boosters: { part: 'booster', count: B.n, radialM: 2.45 }, heightM: 30.5, upper: { name: 'Spoutnik 2 (capsule de Laïka)', radiusM: 1.0, lengthM: 4, color: '#c8ccd2', nozzleM: 0 } } },
  parts: { booster: 'booster.json', core: 'core.json' },
  timeline: build(best, bt),
};
const NL = String.fromCharCode(10), fmt = o => JSON.stringify(o, null, 2).replace(/\{\n\s+"t": ([\s\S]*?)\n\s+\}(?=,?\n\s+[\{\]])/g, m => m.replace(/\n\s+/g, ' ')).replace(/\[\n\s+("[^"]*"[^\]]*?)\n\s+\]/g, m => m.replace(/\n\s+/g, ' '));
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'spoutnik2.json'), fmt(main) + NL);
for (const [k, v] of Object.entries(parts)) fs.writeFileSync(path.join(out, k + '.json'), JSON.stringify(v, null, 2) + NL);
let gmax = 0, tg = 0; for (const s of res.samples) if (s.acc > gmax) { gmax = s.acc; tg = s.t; }
console.log('masse au décollage ' + Math.round(m0(bt)) + ' kg ; poussée/poids au départ ' + ((B.n * FB * B.ispS + CORE.flow * CORE.ispS) / (m0(bt)) ).toFixed(2) + ' ; accélération max ' + gmax.toFixed(2) + ' g à T+' + tg.toFixed(0) + ' s ; événements : ' + res.events.map(e => e.key + '@' + e.t.toFixed(0)).join(' ') + ' ; période ' + (res.orbit.T / 60).toFixed(1) + ' min');
