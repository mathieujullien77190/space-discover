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
function planPitch(plan, t) {   // angle de poussée (rad) au temps t
  const tab = plan.pitch.table;
  if (t <= tab[0][0]) return tab[0][1] * Math.PI / 180;
  for (let i = 1; i < tab.length; i++) if (t <= tab[i][0]) return (tab[i - 1][1] + (tab[i][1] - tab[i - 1][1]) * (t - tab[i - 1][0]) / Math.max(1e-12, tab[i][0] - tab[i - 1][0])) * Math.PI / 180;
  return tab[tab.length - 1][1] * Math.PI / 180;
}
function flyPlan(plan, opt) {
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
