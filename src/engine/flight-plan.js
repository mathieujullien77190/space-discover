import { LCH, lchElements } from './launch.js';
import { phAccel } from './physics.js';
import { ROCKETS } from './rockets.js';

// Moteur de vol piloté par un PLAN DE VOL (fichier JSON) : le plan dit « à quel moment on change de direction, de poussée, de masse » ; en le donnant à `flyPlan`, on retrouve pile la trajectoire.
// Même physique que simulateLaunch (js/launch.js : gravité en 1/r², traînée, poussée avec Isp variable avec la pression, consommation, séparations, intégration semi-implicite à pas fixe), mais EN BOUCLE OUVERTE :
// aucun guidage, aucune condition d'arrêt calculée : tout vient du plan. Le résultat a la même forme que simulateLaunch (échantillons, événements, orbite) : Launch (js/launch-3d.js) l'utilise tel quel.
//
// Format du plan (voir data/plans/kourou-ariane5-500km.json, documenté dans CLAUDE.md) :
//   site { name, lat, lon, azimuthDeg }            lieu et direction du tir (azimut depuis le nord, 90 = plein est)
//   rocket                                          modèle 3D / libellés (js/rockets.js)
//   target { altitudeKm }                           orbite visée (information et tracé)
//   vehicle { payloadKg, fairingKg, cdA, dt, sampleEvery,
//             boosters { count, propKg, dryKg, burnS, ispVac, ispSea, thrustProfile: "srb" | "const" },
//             stage1   { propKg, dryKg, burnS, ispVac, ispSea },
//             stage2   { propKg, dryKg, thrustN, isp } }
//   pitch { table: [[t (s), angle (°)], …] }        direction de la poussée : angle au-dessus de l'horizontale locale (90 = vertical), interpolé linéairement entre les points
//   events [{ t (s), do, … }]                       actions au temps t :
//       { do: "ignite",   engine: "boosters" | "stage1" | "stage2" }       allumage
//       { do: "cutoff",   engine: … }                                      extinction
//       { do: "throttle", engine: …, value: 0…1 }                          change la poussée (et le débit) d'un moteur
//       { do: "separate", part: "boosters" | "stage1" | "fairing" | "payload" }   largage (la masse diminue ; « payload » = fin du vol simulé, le satellite continue sur son orbite)
//     chaque événement peut porter "key" (identifiant utilisé par l'affichage), "label" (texte) et "phase" (nom de la phase qui commence).
// Sans DOM : fonctions pures, testées dans Node (tools/test/plan.test.js).
export function planPitch(plan, t) {   // angle de poussée (rad) au temps t
  const tab = plan.pitch.table;
  if (t <= tab[0][0]) return tab[0][1] * Math.PI / 180;
  for (let i = 1; i < tab.length; i++) if (t <= tab[i][0]) return (tab[i - 1][1] + (tab[i][1] - tab[i - 1][1]) * (t - tab[i - 1][0]) / Math.max(1e-12, tab[i][0] - tab[i - 1][0])) * Math.PI / 180;
  return tab[tab.length - 1][1] * Math.PI / 180;
}
export function flyPlan(plan, opt) {
  const L = LCH, V = plan.vehicle, dt = V.dt || 0.1, sampleEvery = V.sampleEvery || 0.5, G0 = L.G0, az = (plan.site.azimuthDeg != null ? plan.site.azimuthDeg : 90) * Math.PI / 180;
  const wEff = L.WE * Math.cos(plan.site.lat * Math.PI / 180) * Math.sin(az);   // composante de la rotation de la Terre le long de la trajectoire
  const B = V.boosters || { count: 0, propKg: 0, dryKg: 0, burnS: 1, ispVac: 300, ispSea: 280, thrustProfile: 'const' }, S1 = V.stage1, S2 = V.stage2;
  const srbShape = t => B.thrustProfile === 'srb' ? (1.35 - 0.55 * t / B.burnS) / 1.075 : 1;   // boosters à poudre : poussée forte à l'allumage puis décroissante (intégrale = 1)
  const ev = plan.events.slice().sort((a, b) => a.t - b.t);
  let t = 0, x = L.RE, y = 0, vx = 0, vy = wEff * L.RE, nextEv = 0;
  let propB = B.count * B.propKg, propS1 = S1.propKg, propS2 = S2.propKg;
  const on = { boosters: false, stage1: false, stage2: false }, thr = { boosters: 1, stage1: 1, stage2: 1 };
  let bAtt = B.count > 0, s1Att = true, fairing = true, payload = true, phase = 'montée', done = false, crashed = false;
  const events = [], samples = []; let nextSample = 0, maxQ = { q: 0, t: 0 };
  const mass = () => (bAtt ? B.count * B.dryKg + propB : 0) + (s1Att ? S1.dryKg + propS1 : 0) + S2.dryKg + propS2 + (fairing ? V.fairingKg : 0) + (payload ? V.payloadKg : 0);
  const record = (e) => { events.push({ t, label: e.label || e.do, key: e.key || e.do, x, y, vx, vy, alt: Math.hypot(x, y) - L.RE, v: Math.hypot(vx, vy) }); if (e.phase) phase = e.phase; };
  const apply = e => {
    if (e.do === 'ignite') on[e.engine] = true; else if (e.do === 'cutoff') on[e.engine] = false; else if (e.do === 'throttle') thr[e.engine] = e.value;
    else if (e.do === 'separate') { if (e.part === 'boosters') bAtt = false; else if (e.part === 'stage1') { s1Att = false; on.stage1 = false; } else if (e.part === 'fairing') fairing = false; else if (e.part === 'payload') { payload = false; done = true; } }
    if ((e.key || e.label) && !(e.do === 'separate' && e.part === 'payload')) record(e); else if (e.phase) phase = e.phase;
  };
  while (nextEv < ev.length && ev[nextEv].t <= 1e-9) apply(ev[nextEv++]);   // actions à t = 0 (allumage au sol) : avant le premier pas
  const tEnd = opt && opt.tmax ? opt.tmax : 40000;
  while (t < tEnd && !done) {
    const r = Math.hypot(x, y), ux = x / r, uy = y / r, ex = -uy, ey = ux, h = r - L.RE, vr = vx * ux + vy * uy, vt = vx * ex + vy * ey, v = Math.hypot(vx, vy), air = Math.exp(-h / 7200);
    const m = mass(); let F = 0, mdotB = 0, mdotS1 = 0, mdotS2 = 0;
    if (on.boosters && bAtt && propB > 0) { mdotB = B.count * B.propKg / B.burnS * srbShape(t) * thr.boosters; F += mdotB * (B.ispVac - (B.ispVac - B.ispSea) * air) * G0; }
    if (on.stage1 && s1Att && propS1 > 0) { mdotS1 = S1.propKg / S1.burnS * thr.stage1; F += mdotS1 * (S1.ispVac - (S1.ispVac - S1.ispSea) * air) * G0; }
    if (on.stage2 && propS2 > 0) { const f2 = S2.thrustN * thr.stage2; F += f2; mdotS2 = f2 / (S2.isp * G0); }
    // actions du plan arrivées à échéance : traitées APRÈS le calcul de la masse et de la poussée de cet instant (comme simulateLaunch : un événement agit à partir du pas suivant)
    while (nextEv < ev.length && t >= ev[nextEv].t - 1e-6) { apply(ev[nextEv++]); if (done) break; }
    if (done) break;
    const phi = planPitch(plan, t), tx = ux * Math.sin(phi) + ex * Math.cos(phi), ty = uy * Math.sin(phi) + ey * Math.cos(phi);
    const fa = phAccel(x, y, vx, vy, m, F, tx, ty, V.cdA, wEff), q = fa.q, g = fa.g, ax = fa.ax, ay = fa.ay; if (q > maxQ.q) maxQ = { q, t };
    if (t >= nextSample) { samples.push({ t, x, y, vx, vy, m, F, phi, phase, alt: h, v, vr, vt, acc: Math.hypot(ax + g * ux, ay + g * uy) / G0, q, eap: bAtt && propB > 0 && on.boosters, epc: on.stage1 && s1Att && propS1 > 0, esc: on.stage2 && propS2 > 0, fairing, epcAttached: s1Att, eapAttached: bAtt }); nextSample += sampleEvery; }
    // consommation puis intégration semi-implicite (même ordre que simulateLaunch)
    propB = Math.max(0, propB - mdotB * dt); propS1 = Math.max(0, propS1 - mdotS1 * dt); propS2 = Math.max(0, propS2 - mdotS2 * dt);
    vx += ax * dt; vy += ay * dt; x += vx * dt; y += vy * dt; t += dt;
    if (Math.hypot(x, y) < L.RE - 1 && t > 5) { events.push({ t, label: 'Impact', key: 'crash', x, y, vx, vy, alt: Math.hypot(x, y) - L.RE, v: Math.hypot(vx, vy) }); crashed = true; break; }
  }
  const r = Math.hypot(x, y), ux = x / r, uy = y / r, vr = vx * ux + vy * uy, vt = vx * -uy + vy * ux, orbit = lchElements(r, vr, vt);
  const ok = done && !crashed && orbit.rp > L.RE + 100e3 && orbit.e < 0.05;
  if (ok) {   // dernier échantillon = état final exact
    const last = samples[samples.length - 1];
    if (t - last.t > 1e-6) samples.push(Object.assign({}, last, { t, x, y, vx, vy, m: mass(), F: 0, acc: 0, q: 0, alt: r - L.RE, v: Math.hypot(vx, vy), vr, vt, eap: false, epc: false, esc: false, phase: 'en orbite' }));
    const pe = ev.find(e => e.do === 'separate' && e.part === 'payload'); record({ label: (pe && pe.label) || 'Satellite largué', key: (pe && pe.key) || 'sat' });
  }
  return { target: plan.target.altitudeKm, samples, events, orbit, ok, crashed, tEnd: t, state: { x, y, vx, vy }, maxQ, payload: V.payloadKg, final: { alt: (r - L.RE) / 1000, v: Math.hypot(vx, vy) }, plan };
}

// ---------- RETOUR D'UN ÉTAGE (booster qui revient se poser sur la tour) ----------
// Plan de retour (JSON) :
//   vehicle { dryKg, propKg, thrustN (poussée maximale dans le vide, TOUS les moteurs), ispVac, ispSea, cdA, dt, sampleEvery }
//   pitch.table    [[t, angle °], …]   direction de la poussée comme pour la montée (0 = vers l'avant, 90 = vers le haut, 180 = vers l'arrière), interpolée
//   throttle.table [[t, fraction de thrustN], …]   poussée relative (0 = moteurs éteints), interpolée : sert au boostback (et à toute poussée décrite à la main)
//   landing { … }  atterrissage « hoverslam » décrit par des PARAMÈTRES (le moteur de vol applique le freinage, donc modifier le boostback ne casse pas l'atterrissage) :
//       totalEngines, enginesFar (moteurs allumés tant que la vitesse relative dépasse farSpeedMs), enginesNear, enginesMin (poussée minimale en moteurs),
//       ignitionMargin (allumage quand la hauteur restante = distance de freinage à poussée maximale ÷ marge), aimAltitudeM (point visé, un peu sous la tour),
//       crossingSpeedMs (vitesse visée au point), horizontalKp / horizontalKd / horizontalMaxAccel (correction de position horizontale par rapport au pas de tir)
//   target { altitudeM }   hauteur d'arrivée au-dessus du pas de tir (bras de la tour), events [{ t, key, label }] (étiquettes ; l'allumage d'atterrissage et l'arrivée sont ajoutés par le moteur)
// Le pas de tir est dans le plan à l'angle wEff·t (il tourne avec la Terre). start = { t, x, y, vx, vy, wEff } : état à la séparation. opt.control(s) → { thr, phi } remplace tout (essais).
// Résultat : { samples, events, touchdown: { t, missM, speedMs, verticalMs, propLeftKg, ok }, controls }.
export function flyReturn(ret, start, opt) {
  const V = ret.vehicle, L = LCH, dt = V.dt || 0.1, G0 = L.G0, wEff = start.wEff, hT = ret.target.altitudeM, every = V.sampleEvery || 1, control = opt && opt.control, LD = ret.landing;
  const tab = (T, t) => { if (!T || !T.length) return 0; if (t <= T[0][0]) return T[0][1]; for (let i = 1; i < T.length; i++) if (t <= T[i][0]) return T[i - 1][1] + (T[i][1] - T[i - 1][1]) * (t - T[i - 1][0]) / Math.max(1e-12, T[i][0] - T[i - 1][0]); return T[T.length - 1][1]; };
  const padAt = t => { const a = wEff * t; return { x: L.RE * Math.cos(a), y: L.RE * Math.sin(a), vx: -wEff * L.RE * Math.sin(a), vy: wEff * L.RE * Math.cos(a), a }; };
  let t = start.t, x = start.x, y = start.y, vx = start.vx, vy = start.vy, prop = V.propKg, nextS = t, landingOn = false, tLand = null; const samples = [], controls = [], tEnd = start.t + (opt && opt.tmax || 3000);
  let td = null;
  while (t < tEnd) {
    const r = Math.hypot(x, y), ux = x / r, uy = y / r, ex = -uy, ey = ux, h = r - L.RE, air = Math.exp(-h / 7200), m = V.dryKg + prop, eff = 1 - (1 - V.ispSea / V.ispVac) * air, g = L.MU / (r * r), vr = vx * ux + vy * uy;
    let thr, phi;
    if (control) { const c = control({ t, x, y, vx, vy, r, ux, uy, ex, ey, h, air, m, prop, pad: padAt(t), padAt }); thr = c.thr; phi = c.phi; }
    else {
      thr = tab(ret.throttle && ret.throttle.table, t); phi = tab(ret.pitch && ret.pitch.table, t) * Math.PI / 180;
      if (LD) {
        const nF = LD.enginesFar / LD.totalEngines;
        if (!landingOn && vr < 0 && h < 60000) { const aNet = nF * V.thrustN * eff / m - g; if (aNet > 5 && h - hT <= vr * vr / (2 * aNet * LD.ignitionMargin)) { landingOn = true; tLand = t; } }
        if (landingOn) {   // freinage à décélération constante vers le point visé + correction horizontale par rapport au pas de tir
          const pd = padAt(t), k = (L.RE + LD.aimAltitudeM) / L.RE, alt = h - LD.aimAltitudeM;
          const wv = vr - (pd.vx * ux + pd.vy * uy), wh = (vx - pd.vx) * ex + (vy - pd.vy) * ey, rho = (x - pd.x * k) * ex + (y - pd.y * k) * ey;
          const av = wv < 0 ? Math.max(0, (wv * wv - LD.crossingSpeedMs * LD.crossingSpeedMs) / (2 * Math.max(alt, 3))) : 0, ah = -LD.horizontalKp * rho - LD.horizontalKd * wh, lim = LD.horizontalMaxAccel;
          const Fup = m * (av + g), Fh = m * Math.max(-lim, Math.min(lim, ah)), F = Math.hypot(Fup, Fh), vrel = Math.hypot(wv, wh);
          const cap = (vrel > LD.farSpeedMs ? LD.enginesFar : LD.enginesNear) / LD.totalEngines, tmin = LD.enginesMin / LD.totalEngines;
          thr = Math.max(tmin, Math.min(cap, F / (V.thrustN * eff))); phi = Math.atan2(Fup, Fh);
        }
      }
    }
    controls.push([t, thr, phi]);
    if (prop <= 0) thr = 0;
    const F = thr * V.thrustN * eff, md = thr * V.thrustN / (V.ispVac * G0);
    const tx = ux * Math.sin(phi) + ex * Math.cos(phi), ty = uy * Math.sin(phi) + ey * Math.cos(phi);
    const fa = phAccel(x, y, vx, vy, m, F, tx, ty, V.cdA, wEff);
    if (t >= nextS - 1e-9) { samples.push({ t, x, y, vx, vy, m, F, thr, phi, alt: h, v: Math.hypot(vx, vy), q: fa.q }); nextS += every; }
    if (h <= hT && t > start.t + 5 && vr < 0) {   // arrivée à la hauteur de la tour, en descendant
      const pd = padAt(t), ang = Math.atan2(y, x) - pd.a, dvx = vx - pd.vx, dvy = vy - pd.vy;
      td = { t, missM: ang * L.RE, speedMs: Math.hypot(dvx, dvy), verticalMs: -(dvx * ux + dvy * uy), propLeftKg: prop, ok: Math.abs(ang * L.RE) < 30 && Math.hypot(dvx, dvy) < 8 };
      samples.push({ t, x, y, vx, vy, m, F: 0, thr: 0, alt: h, v: Math.hypot(vx, vy), q: fa.q }); break;
    }
    prop = Math.max(0, prop - md * dt);
    vx += fa.ax * dt; vy += fa.ay * dt; x += vx * dt; y += vy * dt; t += dt;
    if (Math.hypot(x, y) < L.RE - 1) break;
  }
  const events = (ret.events || []).map(e => Object.assign({}, e));
  if (tLand != null) events.push({ t: tLand, key: 'landingBurn', label: (ret.landingLabel || 'Allumage d’atterrissage') });
  if (td) events.push({ t: td.t, key: 'catch', label: (ret.catchLabel || 'Le booster est rattrapé par les bras de la tour') });
  events.sort((a, b) => a.t - b.t);
  return { samples, events, touchdown: td, controls, ok: !!(td && td.ok) };
}

// ---------- DESCRIPTION VISUELLE ET MASSES DES OBJETS : tout vient du plan JSON ----------
// plan.visual { name, short, tower, names { booster, stage1, stage2 }, model { core {r, h, color}, boosters {n, r, h, nose, R, color, band} | null, upper {r, h, color}, fairing {r, cyl, cone, color}, noz {epc, eap, esc} } }
// (couleurs : "#rrggbb"). Sans « visual », on retombe sur la fusée nommée dans plan.rocket (js/rockets.js). Les masses des objets largués viennent de plan.vehicle et plan.jettison.
export function planToSpec(plan) {
  const base = ROCKETS[plan.rocket] || ROCKETS.ariane5, vis = plan.visual, V = plan.vehicle, col = c => (typeof c === 'string' ? parseInt(c.replace('#', ''), 16) : c);
  let model = base.model;
  if (vis && vis.model) { model = JSON.parse(JSON.stringify(vis.model)); for (const k of ['core', 'boosters', 'upper', 'fairing']) if (model[k]) { if (model[k].color != null) model[k].color = col(model[k].color); if (model[k].band != null) model[k].band = col(model[k].band); } }
  const B = V.boosters || { dryKg: 0 }, S1 = V.stage1;
  return {
    name: (vis && vis.name) || plan.name || base.name, short: (vis && vis.short) || base.short, maxPayload: 1e12,
    phys: { eap: { dry: B.dryKg }, epc: { dry: S1.dryKg, prop: S1.propKg }, fairing: V.fairingKg || 0, direct: false },
    names: Object.assign({}, base.names, vis && vis.names), model, tower: vis ? !!vis.tower : !!base.tower, sepDv: {},
  };
}
