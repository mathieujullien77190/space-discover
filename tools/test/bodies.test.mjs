// ASTRES décrits en JSON (objects/{earth,moon,sun,mars,halley}/*.json, js/bodies.js) : cohérence des constantes avec le moteur, positions de la Lune et du Soleil inchangées, éléments orbitaux de Mars et de Halley validés contre des faits connus.
// node tools/test/bodies.test.js
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; 
import { loadEngine, root } from './engine-loader.mjs';

const ctx = await loadEngine();
const DEG_ = Math.PI / 180, G_ = e => vm.runInContext(e, ctx), fails = [], check = (c, m) => { console.log((c ? 'ok   ' : 'ÉCHEC ') + m); if (!c) fails.push(m); };
const G = e => vm.runInContext(e, ctx), AU = 149597870700, dayOf = iso => G('EPH.days(' + Date.parse(iso) + ')'), geo = (id, iso) => G('BODY.geo("' + id + '", ' + dayOf(iso) + ')'), dist = (a, b, iso) => G('BODY.distance("' + a + '", "' + b + '", ' + dayOf(iso) + ')');
// 1. schéma : chaque astre a ce qu'il faut ; menu ordonné
const list = G('BODY.list()'), ids = list.map(b => b.id).sort().join(' '), menu = G('BODY.menu().map(b => b.id)').join(' ');
const models = ['meeus-moon', 'meeus-sun', 'inverse', 'kepler'], orders = list.filter(b => b.menu).map(b => b.menu.order);
check(list.length >= 5 && list.every(b => b.name && b.radiusKm > 0 && b.bodyType && b.motion && models.includes(b.motion.model) && b.appearance) && new Set(orders).size === orders.length, 'astres : ' + ids + ' (types : ' + list.map(b => b.id + '=' + b.bodyType).join(', ') + ')');
{ const ord = G('BODY.menu().map(b => b.menu.order)'); check(ord.every((v, i) => i === 0 || v > ord[i - 1]) && menu.startsWith('mercury venus earth moon sun mars') && menu.includes('jupiter saturn uranus neptune pluto') && menu.split(' ').length === list.length, 'menu des vues (ordre du JSON, ' + menu.split(' ').length + ' astres) : ' + menu.split(' ').slice(0, 9).join(' ') + ' …'); }
check(G('BODY.origin()') === 'earth' && G('BODY.list().filter(b => b.thirdBody).map(b => b.id)').join() === 'moon,sun', 'origine de la scène : ' + G('BODY.origin()') + ' ; astres qui attirent les engins : ' + G('BODY.list().filter(b => b.thirdBody).map(b => b.id)').join(', '));
// 2. constantes du JSON = constantes du moteur de vol (physics.js, launch.js)
const E = G('FLIGHT_OBJECTS.earth');
check(Math.abs(E.radiusKm * 1000 - G('PH.RE')) < 1e-6 && Math.abs(E.radiusKm * 1000 - G('LCH.RE')) < 1e-6 && Math.abs(E.muM3S2 - G('PH.MU')) < 1 && Math.abs(E.muM3S2 - G('LCH.MU')) < 1 && Math.abs(E.rotationRadS - G('PH.WE')) < 1e-12 && Math.abs(E.rotationRadS - G('LCH.WE')) < 1e-12, 'Terre : rayon ' + E.radiusKm + ' km, µ ' + E.muM3S2 + ', rotation ' + E.rotationRadS + ' rad/s : identiques à physics.js et launch.js');
check(G('EPH.MU_MOON') === G('FLIGHT_OBJECTS.moon.muM3S2') && G('EPH.MU_SUN') === G('FLIGHT_OBJECTS.sun.muM3S2') && Math.abs(G('EPH.AU_M') - AU) < 1 && Math.abs(G('EPH.EPS') - 23.4393 * Math.PI / 180) < 1e-12, 'éphémérides : µ de la Lune et du Soleil, unité astronomique (' + G('EPH.AU_M') + ' m) et obliquité lus dans les JSON');
// 3. Lune et Soleil : mêmes positions qu'avant le passage en JSON
const m = geo('moon', '2026-10-02T12:00:00Z'), s = geo('sun', '2026-10-02T12:00:00Z');
check(Math.abs(Math.hypot(...m) / 1000 - 364251) < 2 && Math.abs(Math.hypot(...s) / AU - 1.0009) < 0.0002, 'Lune à ' + Math.round(Math.hypot(...m) / 1000) + ' km (364 251 attendus), Soleil à ' + (Math.hypot(...s) / AU).toFixed(4) + ' UA (1,0009 attendu) le 2 oct. 2026');
// 4. la Terre vue du Soleil : une orbite de ≈ 1 UA ; origine de la scène
const e0 = geo('earth', '2026-10-02T12:00:00Z'), pts = G('BODY.orbitPoints("earth", ' + dayOf('2026-01-01T00:00:00Z') + ', 365)'), rr = pts.map(p => Math.hypot(...p) / AU);
check(e0.every(c => c === 0) && Math.min(...rr) > 0.98 && Math.max(...rr) < 1.02 && Math.hypot(...pts[0].map((c, i) => c - pts[365][i])) < 3e8, 'Terre : à l\'origine de la scène ; orbite autour du Soleil de ' + Math.min(...rr).toFixed(4) + ' à ' + Math.max(...rr).toFixed(4) + ' UA (périhélie début janvier), 366 points, boucle fermée à ' + (Math.hypot(...pts[0].map((c, i) => c - pts[365][i])) / 1000).toFixed(0) + ' km près');
// 5. Mars (planète décrite par ses éléments) : distance au Soleil dans [q, Q], période, et opposition de janvier 2025 (≈ 0,64 UA de la Terre)
const mq = 227939200e3 * (1 - 0.0934) / AU, mQ = 227939200e3 * (1 + 0.0934) / AU; let dmin = 9, dmax = 0; for (let k = 0; k < 120; k++) { const d = G('BODY.distance("mars", "sun", ' + (dayOf('2026-01-01T00:00:00Z') + k * 6) + ')') / AU; dmin = Math.min(dmin, d); dmax = Math.max(dmax, d); }
const mp = G('BODY.get("mars").motion.periodDays'), D1 = dayOf('2026-03-01T00:00:00Z'), a1 = G('BODY.rel("mars", ' + D1 + ')'), a2 = G('BODY.rel("mars", ' + (D1 + mp) + ')');   // position HÉLIOCENTRIQUE (la position géocentrique ne revient pas : la Terre a bougé)
check(dmin > mq - 0.01 && dmax < mQ + 0.01 && dmax - dmin > 0.2, 'Mars : distance au Soleil de ' + dmin.toFixed(3) + ' à ' + dmax.toFixed(3) + ' UA (périhélie ' + mq.toFixed(3) + ', aphélie ' + mQ.toFixed(3) + ')');
check(Math.hypot(...a1.map((c, i) => c - a2[i])) / 1000 < 5, 'Mars : revient au même point après une période de ' + mp + ' jours (écart ' + (Math.hypot(...a1.map((c, i) => c - a2[i])) / 1000).toFixed(2) + ' km)');
const d25 = dist('earth', 'mars', '2025-01-16T00:00:00Z') / AU, d22 = dist('earth', 'mars', '2022-12-01T00:00:00Z') / AU;
check(d25 > 0.60 && d25 < 0.70 && d22 > 0.52 && d22 < 0.62, 'oppositions de Mars : ' + d25.toFixed(3) + ' UA le 16 janv. 2025 (≈ 0,64 attendus), ' + d22.toFixed(3) + ' UA le 1er déc. 2022 (≈ 0,55 attendus) — éléments moyens J2000, précision de quelques %');
// 6. comète de Halley : périhélie le 9 février 1986 (0,587 UA), aphélie en 2023 (≈ 35 UA), orbite de 75 ans, forte excentricité
const hq = dist('halley', 'sun', '1986-02-09T12:00:00Z') / AU, hq2 = dist('halley', 'sun', '1986-02-09T12:00:00Z') / AU, hn = dist('halley', 'sun', '2026-10-05T00:00:00Z') / AU, ha = dist('halley', 'sun', '2023-12-09T00:00:00Z') / AU;
check(Math.abs(hq - 0.587) < 0.01 && ha > 34.5 && ha < 35.3 && hn > 34 && hn < 35.3, 'Halley : ' + hq.toFixed(3) + ' UA du Soleil au périhélie du 9 févr. 1986 (0,587 attendu), ' + ha.toFixed(1) + ' UA à l\'aphélie (déc. 2023, ≈ 35 attendus), ' + hn.toFixed(1) + ' UA aujourd\'hui');
const hp = G('BODY.get("halley").motion.periodDays'), h1 = G('BODY.rel("halley", ' + dayOf('1986-02-09T12:00:00Z') + ')'), h2 = G('BODY.rel("halley", ' + (dayOf('1986-02-09T12:00:00Z') + hp) + ')');
check(Math.abs(hp / 365.2422 - 75.3) < 0.1 && Math.hypot(...h1.map((c, i) => c - h2[i])) / 1000 < 5, 'Halley : période ' + (hp / 365.2422).toFixed(1) + ' ans, retour au périhélie en 2061 (écart de ' + (Math.hypot(...h1.map((c, i) => c - h2[i])) / 1000).toFixed(0) + ' km)');
const hpts = G('BODY.orbitPoints("halley", ' + dayOf('2026-01-01T00:00:00Z') + ', 365)'), hr = hpts.map(p => Math.hypot(...p) / AU);
check(Math.min(...hr) < 0.6 && Math.max(...hr) > 35 && hpts.every(p => p.every(Number.isFinite)) && Math.hypot(...hpts[0].map((c, i) => c - hpts[365][i])) < 1e6, 'orbite de Halley (par anomalie excentrique) : de ' + Math.min(...hr).toFixed(2) + ' à ' + Math.max(...hr).toFixed(1) + ' UA, 366 points réguliers, boucle fermée');
// 7. un modèle inconnu est refusé clairement
let err = null; try { G('(() => { FLIGHT_OBJECTS.__x = { kind: "body", name: "x", radiusKm: 1, bodyType: "planet", around: "sun", motion: { frame: "heliocentric", model: "inconnu" }, appearance: { kind: "sphere" } }; try { return BODY.rel("__x", 0); } finally { delete FLIGHT_OBJECTS.__x; } })()'); } catch (e) { err = e; }
check(!!err && /modèle de mouvement inconnu/.test(err.message), 'modèle de mouvement inconnu refusé : ' + (err && err.message));
// 8. la trace d'un astre képlérien passe par l'astre : distance de Mars (rayon 3 390 km) à la polyligne de son orbite (2 048 points, comme app.js) < 1 000 km à plusieurs dates ; Halley : < 1 % de sa distance au Soleil
{ const segD = (p, a, b) => { const ab = b.map((v, i) => v - a[i]), ap = p.map((v, i) => v - a[i]); let t = (ab[0] * ap[0] + ab[1] * ap[1] + ab[2] * ap[2]) / (ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2); t = Math.max(0, Math.min(1, t)); return Math.hypot(...ap.map((v, i) => v - t * ab[i])); };
  for (const [id, tol] of [['mars', 1000e3], ['halley', 50e3]]) { let worst = 0, rel = 0;
    for (const iso of ['2026-10-05', '2027-06-01', '2030-01-01', '2040-07-01']) { const D = dayOf(iso), m = G('BODY.geo("' + id + '", ' + D + ')'), sn = G('BODY.geo("sun", ' + D + ')'), r = m.map((v, i) => v - sn[i]), pts = G('BODY.orbitPoints("' + id + '", ' + D + ', ' + G('BODY.orbitSamples("' + id + '")') + ')');
      let best = 1e99; for (let i = 0; i < pts.length - 1; i++) best = Math.min(best, segD(r, pts[i], pts[i + 1])); worst = Math.max(worst, best); rel = Math.max(rel, best / Math.hypot(...r)); }
    check(worst < tol, id + ' : la trace de l’orbite passe à ' + (worst / 1000).toFixed(0) + ' km de l’astre (' + (rel * 100).toFixed(4) + ' % de sa distance au Soleil)'); } }
// 9. Mars texturé et orienté : sa carte existe, le pôle nord du maillage pointe vers (α0, δ0), le méridien origine tourne de 350,89° par jour (sens direct autour du pôle), la carte a bien la taille annoncée
{ const mars = G('BODY.get("mars")'), q = d => G('(() => { const q = new THREE.Quaternion(); rotationQuat(BODY.get("mars").rotation, ' + d + ', q); return q; })()'), V = (x, y, z) => G('new THREE.Vector3(' + x + ',' + y + ',' + z + ')');
  const a = mars.rotation.poleRaDeg * Math.PI / 180, dd = mars.rotation.poleDecDeg * Math.PI / 180, poleEq = [Math.cos(dd) * Math.cos(a), Math.cos(dd) * Math.sin(a), Math.sin(dd)], poleScene = [poleEq[0], poleEq[2], -poleEq[1]];
  const q0 = q(0), y0 = V(0, 1, 0).applyQuaternion(q0), x0 = V(1, 0, 0).applyQuaternion(q0), x1 = V(1, 0, 0).applyQuaternion(q(0.1)), pole = V(...poleScene);
  check(y0.distanceTo(pole) < 1e-9, 'Mars : le pôle nord du maillage pointe vers α = ' + mars.rotation.poleRaDeg + '°, δ = ' + mars.rotation.poleDecDeg + '°');
  const ang = Math.acos(Math.max(-1, Math.min(1, x0.dot(x1)))) * 180 / Math.PI, sens = V(0, 0, 0).crossVectors(x0, x1).dot(pole);
  check(Math.abs(ang - 35.089) < 0.01 && sens > 0, 'Mars : méridien origine à ' + ang.toFixed(3) + '° de plus 0,1 jour plus tard (35,089° attendus), dans le sens direct autour du pôle');
  check(Math.abs(x0.dot(pole)) < 1e-9, 'Mars : le méridien origine est sur l’équateur de la planète');
  const mapPath = path.join(root, 'public', 'objects', 'mars', mars.appearance.texture), size = fs.existsSync(mapPath) ? fs.statSync(mapPath).size : 0;
  check(mars.appearance.kind === 'textured' && size > 200000 && size < 3e6, 'Mars : carte ' + mars.appearance.texture + ' présente (' + (size / 1e6).toFixed(2) + ' Mo, domaine public NASA / USGS)'); }
// 10. TOUS les astres képlériens : la période écrite dans le JSON doit être celle que donne la 3e loi de Kepler (demi-grand axe + masses) à 1 % près : contrôle croisé des valeurs écrites de mémoire (a, période, masse) ;
//     les lunes sont en orbite autour de leur planète dans le plan de son équateur (inclinaison mesurée = inclinaison du JSON, rétrograde pour i > 90°) ; chaque carte et chaque fiche existent
{ const G = 6.6743e-11, mu = b => b.muM3S2 || G * b.massKg, ids = G_('BODY.ids()'); let n = 0, moons = 0;
  for (const id of ids) { const b = G_('BODY.get("' + id + '")'), m = b.motion; if (m.model !== 'kepler') continue; n++;
    const parent = G_('BODY.get("' + b.around + '")'), T = 2 * Math.PI * Math.sqrt(Math.pow(m.semiMajorAxisKm * 1000, 3) / (mu(parent) + mu(b))) / 86400;
    check(Math.abs(T / m.periodDays - 1) < 0.01, id + ' : période ' + m.periodDays + ' j, 3e loi de Kepler ' + T.toFixed(3) + ' j');
    if (b.appearance.kind === 'textured') check(fs.existsSync(path.join(root, 'public', 'objects', id, b.appearance.texture)) && fs.existsSync(path.join(root, 'public', 'objects', id, b.card.image)), id + ' : carte et fiche présentes');
    if (m.planeOf) { moons++;
      const D = dayOf('2026-10-05'), p0 = G_('BODY.rel("' + id + '", ' + D + ')'), p1 = G_('BODY.rel("' + id + '", ' + (D + m.periodDays / 40) + ')'), nrm = [p0[1] * p1[2] - p0[2] * p1[1], p0[2] * p1[0] - p0[0] * p1[2], p0[0] * p1[1] - p0[1] * p1[0]], nl = Math.hypot(...nrm);
      const fr = G_('BODY.planeFrame("' + b.around + '")'), eq = [fr.fz[0], fr.fz[1], fr.fz[2]], toScene = v => [v[0], v[2], -v[1]];   // pôle de la planète en axes de la scène : écliptique → équatorial → scène
      const eps = G_('EPH.EPS'), poleEq = [eq[0], eq[1] * Math.cos(eps) - eq[2] * Math.sin(eps), eq[1] * Math.sin(eps) + eq[2] * Math.cos(eps)], pole = toScene(poleEq);
      const cosi = (nrm[0] * pole[0] + nrm[1] * pole[1] + nrm[2] * pole[2]) / nl, iMeas = Math.acos(cosi) / DEG_;
      check(Math.abs(iMeas - m.inclinationDeg) < 0.6 || (m.inclinationDeg < 0.6 && iMeas < 1.2), id + ' : plan orbital incliné de ' + iMeas.toFixed(2) + '° sur l’équateur de ' + b.around + ' (JSON : ' + m.inclinationDeg + '°)');
      check(G_('bodyCard("' + id + '")').facts.length >= 5, id + ' : fiche complète'); } }
  check(n >= 28 && moons >= 21, n + ' astres képlériens, dont ' + moons + ' lunes d’une planète'); }
if (fails.length) { console.log(fails.length + ' échec(s)'); process.exit(1); }
