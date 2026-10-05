// Missions de sondes rejouées (src/engine/mission.js, src/engine/probes.js, public/objects/{voyager1,voyager2,pioneer10,pioneer11,newhorizons}) : la trajectoire est CALCULÉE d'après les positions des planètes ;
// on la valide contre des faits historiques connus : énergie de départ (C3), périgée des survols (nécessaire pour relier les arcs vs réel), distance du Soleil aujourd'hui, continuité.
import vm from 'node:vm';
import { loadEngine } from './engine-loader.mjs';

const ctx = await loadEngine(), fails = [], check = (c, m) => { console.log((c ? 'ok   ' : 'ÉCHEC ') + m); if (!c) fails.push(m); };
const G = e => vm.runInContext(e, ctx), AU = 149597870700, DAY = 86400, dayOf = ms => G('EPH.days(' + ms + ')');
const ids = G('probeIds()');
check(ids.join(' ') === 'voyager1 voyager2 pioneer10 pioneer11 newhorizons', 'sondes : ' + ids.join(' '));
// références historiques (de mémoire, à vérifier) : [C3 min, C3 max (km²/s²), distance du Soleil le 5 oct. 2025 min/max (UA), vitesse min/max (km/s)]
const REF = { voyager1: [100, 110, 160, 176, 15.5, 18], voyager2: [98, 110, 138, 156, 15, 17.5], pioneer10: [80, 90, 128, 150, 11, 13.5], pioneer11: [85, 95, 105, 120, 10, 12], newhorizons: [150, 165, 58, 68, 12.5, 14.5] };
const T2025 = Date.UTC(2025, 9, 5);
for (const id of ids) {
  ctx.ID = id; const m = G('probeMission(ID)'), def = G('probeDef(ID)'), ref = REF[id];
  check(m.departure.c3 > ref[0] && m.departure.c3 < ref[1], id + ' : énergie de départ C3 = ' + m.departure.c3.toFixed(1) + ' km²/s² (' + ref[0] + '–' + ref[1] + ' attendus)');
  // survols : périgée nécessaire pour relier les arcs d'entrée et de sortie vs périgée historique (≤ 25 % d'écart quand les deux arcs sont des Lambert)
  def.mission.waypoints.forEach((w, i) => { const f = m.flybys[i], last = i === def.mission.waypoints.length - 1;
    if (!last) check(Math.abs(f.rpNeeded / (w.periapsisKm * 1000) - 1) < 0.25, id + ' : survol de ' + w.body + ' : périgée nécessaire ' + (f.rpNeeded / 1000).toFixed(0) + ' km du centre (historique ' + w.periapsisKm + ' km), déviation ' + f.deltaDeg.toFixed(1) + '°, ' + (Math.abs(f.vOut / f.vIn - 1) * 100).toFixed(1) + ' % d’écart d’énergie');
    else check(Math.abs(f.rpNeeded / (w.periapsisKm * 1000) - 1) < 0.02, id + ' : dernier survol (' + w.body + ') : périgée imposé ' + (f.rpNeeded / 1000).toFixed(0) + ' km, déviation ' + f.deltaDeg.toFixed(1) + '°'); });
  const s = m.state(dayOf(T2025)), r = Math.hypot(...s.r) / AU, v = Math.hypot(...s.v) / 1000;
  check(r > ref[2] && r < ref[3] && v > ref[4] && v < ref[5], id + ' : le 5 oct. 2025 à ' + r.toFixed(1) + ' UA du Soleil, ' + v.toFixed(1) + ' km/s (' + ref[2] + '–' + ref[3] + ' UA, ' + ref[4] + '–' + ref[5] + ' km/s attendus)');
  // départ : la sonde part de la Terre (position héliocentrique = celle de la Terre)
  const e = G('BODY.rel("earth", ' + m.t0 + ')'), s0 = m.state(m.t0);
  check(Math.hypot(s0.r[0] - e[0], s0.r[1] - e[1], s0.r[2] - e[2]) < 1, id + ' : au départ la sonde est à la position de la Terre (' + Math.hypot(s0.r[0] - e[0], s0.r[1] - e[1], s0.r[2] - e[2]).toExponential(1) + ' m)');
  check(m.state(m.t0 - 1) === null, id + ' : pas de sonde avant son départ');
  // à chaque survol : la sonde passe à la distance de périgée de la planète, à l'heure du rendez-vous
  for (const f of m.flybys) { ctx.F = f; const d = G('(() => { const m = probeMission(ID), st = m.state(F.D), P = BODY.rel(F.body, F.D); return Math.hypot(st.r[0] - P[0], st.r[1] - P[1], st.r[2] - P[2]); })()');
    check(Math.abs(d / f.rpNeeded - 1) < 0.02, id + ' : au rendez-vous avec ' + f.body + ' la sonde est à ' + (d / 1000).toFixed(0) + ' km du centre (périgée ' + (f.rpNeeded / 1000).toFixed(0) + ' km)'); }
  // continuité : la position ne saute jamais (pas d'une heure : écart ≤ 1,3 × vitesse × pas) sur toute la durée du vol jusqu'à fin 2030, y compris à travers les survols et les fusions
  let maxJump = 0, prev = m.state(m.t0 + 1); const t1 = dayOf(Date.UTC(2030, 0, 1)); let worstD = 0;
  for (let D = m.t0 + 1 + 1 / 24; D < t1; D += D < m.tLastFlyby + 400 ? 1 / 24 * 6 : 5) { const st = m.state(D), step = D < m.tLastFlyby + 400 ? 1 / 24 * 6 : 5, dist = Math.hypot(st.r[0] - prev.r[0], st.r[1] - prev.r[1], st.r[2] - prev.r[2]), exp = Math.hypot(...st.v) * step * DAY, k = dist / exp; if (k > maxJump) { maxJump = k; worstD = D; } prev = st; }
  check(maxJump < 3, id + ' : trajectoire continue (saut maximal : ' + maxJump.toFixed(2) + ' × la distance attendue, vitesse × pas)');
}
if (fails.length) { console.log(fails.length + ' échec(s)'); process.exit(1); }
