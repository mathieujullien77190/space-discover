// SPOUTNIK 2 (3 novembre 1957, Laïka) : objet JSON public/objects/spoutnik2/ (R-7 + pas de tir de Tiouratam, comme Spoutnik 1), fabriqué par tools/make-spoutnik2.js.
// Vérifie : l'orbite visée est atteinte (≈ 212 × 1 660 km, 103,7 min, inclinaison 65,3°), le satellite RESTE attaché à l'étage central, même fusée et même pas de tir que Spoutnik 1, bilan de masse, événements.
// Valeurs de référence (de mémoire, à vérifier : NASA / NSSDC « Sputnik 2 ») : orbite 212 × 1 660 km, 65,3°, 103,7 min, 508 kg.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { loadEngine, root } from './engine-loader.mjs';

const ctx = await loadEngine(), fails = [], RE = 6378137, DEG = Math.PI / 180, G = e => vm.runInContext(e, ctx);
const check = (c, m) => { console.log((c ? 'ok   ' : 'ÉCHEC ') + m); if (!c) fails.push(m); };
const dir = path.join(root, 'public', 'objects', 'spoutnik2'), load = () => { const o = JSON.parse(fs.readFileSync(path.join(dir, 'spoutnik2.json'), 'utf8')); for (const [k, f] of Object.entries(o.parts || {})) if (typeof f === 'string') o.parts[k] = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); return o; };
const fly = o => ctx.flyObject(JSON.parse(JSON.stringify(o))), O = load(), r = fly(O);

// 1. l'orbite visée est atteinte
const rp = (r.orbit.rp - RE) / 1000, ra = (r.orbit.ra - RE) / 1000, T = r.orbit.T / 60;
check(r.ok && !r.crashed, 'Spoutnik 2 : orbite atteinte (' + (r.message || '').slice(0, 60) + ')');
check(Math.abs(rp - 212) <= 15 && Math.abs(ra - 1660) <= 25, 'orbite ' + rp.toFixed(0) + ' × ' + ra.toFixed(0) + ' km (212 × 1 660 km visés, ±15 / ±25 km)');
check(Math.abs(T - 103.7) <= 0.6, 'période ' + T.toFixed(1) + ' min (103,7 min : un tour en « environ 1 h 45 »)');
// 2. inclinaison : le tir part à l'azimut sin A = cos i / cos(latitude) du pas de tir
const A = O.start.azimuthDeg * DEG, inc = Math.acos(Math.cos(O.start.lat * DEG) * Math.sin(A)) / DEG;
check(Math.abs(inc - 65.3) <= 0.3, 'inclinaison ' + inc.toFixed(2) + '° (65,3° visés) : azimut du tir ' + O.start.azimuthDeg + '° depuis le nord, latitude ' + O.start.lat + '°');
// 3. même pas de tir et même fusée que Spoutnik 1 (réutilisation des valeurs de rockets.js)
const site = G('LAUNCH_SITES.find(s => s.id === "baikonour")'), R7 = G('ROCKETS.r7.phys');
check(O.start.lat === site.lat && O.start.lon === site.lon, 'même pas de tir que Spoutnik 1 : Tiouratam / Baïkonour (' + site.lat + '° N, ' + site.lon + '° E)');
check(O.parts.booster.massKg === R7.eap.dry && O.visual.stack.boosters.count === R7.eap.n, 'même fusée : ' + O.visual.stack.boosters.count + ' boosters de ' + O.parts.booster.massKg + ' kg à vide (R-7 de rockets.js : ' + R7.eap.n + ' × ' + R7.eap.dry + ' kg)');
const first = O.timeline[0], isp = (first.ispVac), expectedIspV = (R7.eap.n * (R7.eap.prop / R7.eap.burn) * R7.eap.ispV + R7.epc.prop / R7.epc.burn * R7.epc.ispV) / (R7.eap.n * (R7.eap.prop / R7.eap.burn) + R7.epc.prop / R7.epc.burn);
check(Math.abs(isp - expectedIspV) < 0.5, 'même moteurs : Isp effective au départ ' + isp + ' s dans le vide (R-7 : ' + expectedIspV.toFixed(1) + ' s)');
// 4. PARTICULARITÉ : le satellite reste attaché à l'étage central : aucune pièce « payload » n'est larguée, seuls les 4 boosters partent
const roles = Object.values(O.parts).map(p => p.role), jet = Object.keys(r.plan.jettison || {});
check(!roles.includes('payload') && !O.timeline.some(k => (k.release || []).some(x => O.parts[x.part].role === 'payload')), 'le satellite reste attaché : aucune pièce « payload » dans l’objet, aucun largage de satellite');
check(O.timeline.filter(k => k.release).length === 2 && O.timeline.find(k => k.release).release[0].part === 'booster' && jet.join() === 'boosters,fairing', 'deux largages : les boosters, puis le couvercle du satellite (' + jet.join(', ') + ')');
// 5. événements dans l'ordre : décollage, boosters (≈ T+116 s), arrêt du moteur central, orbite atteinte
const ev = k => (r.events.find(e => e.key === k) || {}).t, keys = r.events.map(e => e.key);
check(keys.join(' ') === 't0 eap meco fairing objectOrbit' && Math.abs(ev('eap') - 116) < 1 && ev('meco') > 290 && ev('meco') < 330, 'événements : ' + r.events.map(e => e.key + '@' + e.t.toFixed(0)).join(' '));
// 6. bilan de masse : à l'arrêt du moteur, il reste le bloc central à vide + le satellite (≈ 7,5 t + 508 kg) et un peu d'ergols
const mEnd = r.samples.find(s => s.t >= ev('meco') + 1).m + 300, m0 = r.samples[0].m, expectedEnd = 7500 + 508.3 + 150;
check(Math.abs(mEnd - expectedEnd) / expectedEnd < 0.05, 'masse : ' + Math.round(m0) + ' kg au décollage, ' + Math.round(mEnd) + ' kg en orbite (bloc central à vide + satellite de 508 kg ≈ ' + Math.round(expectedEnd) + ' kg)');
check(O.timeline[0].massKg / 1000 > 270 && O.timeline[0].massKg / 1000 < 295, 'masse au décollage ' + (O.timeline[0].massKg / 1000).toFixed(0) + ' t (R-7 ≈ 267-280 t)');
// 7. une fusée trop lente retombe : même objet, moteur central coupé 80 s trop tôt
{ const slow = JSON.parse(JSON.stringify(O)), meco = slow.timeline.find(k => k.key === 'meco'); meco.t -= 80; for (const k of slow.timeline) if (typeof k.pitch === 'number' && k.t > meco.t) k.t = meco.t; const rs = ctx.flyObject(slow);
  check(!rs.ok && rs.crashed, 'coupure 80 s trop tôt : l’objet retombe (' + (rs.message || '').slice(0, 55) + ')'); }
// 8. accélération maximale : annoncée (le bloc central presque vide accélère fort à la fin : ≈ 12 g, limite du modèle de mémoire)
let gmax = 0; for (const s of r.samples) gmax = Math.max(gmax, s.acc || 0);
check(gmax > 5 && gmax < 14, 'accélération maximale ' + gmax.toFixed(1) + ' g (en fin de poussée : bloc central presque vide)');
if (fails.length) { console.log(fails.length + ' échec(s)'); process.exit(1); }
