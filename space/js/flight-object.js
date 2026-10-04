// OBJET GÉNÉRIQUE décrit par un JSON minimal : un point de départ + une LISTE DE PALIERS datés (masse, poussée ou accélération, direction, vitesse…). Le moteur ne devine rien :
// il applique les paliers et intègre la physique (gravité en 1/r², traînée, poussée) ; si la vitesse donnée est trop faible, l'objet retombe sur la Terre, si elle est bonne il reste en orbite.
// Une fusée, un satellite, l'ISS, un missile : même format. Résultat de la même forme que flyPlan (js/flight-plan.js) : `Launch` (js/launch-3d.js) l'affiche tel quel via `opts.object`.
//
// Format (data/objects/*.json, documenté dans CLAUDE.md) :
//   name                         nom affiché
//   start { lat, lon, altitudeKm | altitudeM, azimuthDeg (0 = nord, 90 = est), elevationDeg (90 = vertical), speedMs, frame: "ground" | "inertial" }
//         vitesse initiale par rapport au sol ("ground", défaut : la rotation de la Terre s'y ajoute) ou dans le repère inertiel ("inertial" : pour un objet déjà en orbite)
//   visual { name, lengthM, radiusM, color }         forme 3D (cylindre) ; facultatif
//   dryKg                        masse en dessous de laquelle plus de poussée (réservoirs vides) ; défaut 0
//   timeline [{ t (s), … }]      paliers triés par temps ; chaque clé n'est donnée QUE si elle change à cet instant, le reste garde sa valeur :
//       massKg       masse totale (un largage = une baisse de masse)
//       thrustN      poussée en newtons                    | accelMs2 : accélération due à la poussée (m/s²), poussée = accelMs2 × masse
//       isp          impulsion spécifique (s) : la masse diminue alors toute seule (débit = poussée / (isp·g0)) | burnKgS : débit imposé (kg/s)
//       pitch        direction de la poussée, degrés au-dessus de l'horizontale locale (90 = vertical), interpolée linéairement d'un palier « pitch » au suivant
//       speedMs      remet la vitesse par rapport au sol à cette valeur (direction conservée)
//       cdA          surface × coefficient de traînée (m²)
//       label, key, phase   texte de l'étape (liste des choses à faire), identifiant, nom de la phase qui commence
//     le DERNIER palier marque la fin de la poussée : ensuite l'objet vole sans moteur (orbite ou chute).
// Sans DOM : fonctions pures, testées dans Node (tools/test/object.test.js).
function validateObject(o) {
  if (!o || typeof o !== 'object') throw new Error('objet vide');
  if (!o.start || o.start.lat == null || o.start.lon == null) throw new Error('« start » (lat, lon) manquant');
  if (!Array.isArray(o.timeline) || !o.timeline.length) throw new Error('« timeline » manquante');
  if (o.timeline.every(k => k.massKg == null) && o.massKg == null) throw new Error('aucune masse (« massKg » dans un palier)');
  return o;
}
function objectPitch(pts, t) {   // direction (rad) interpolée entre les paliers qui donnent « pitch »
  if (!pts.length) return Math.PI / 2;
  if (t <= pts[0][0]) return pts[0][1] * Math.PI / 180;
  for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) return (pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * (t - pts[i - 1][0]) / Math.max(1e-12, pts[i][0] - pts[i - 1][0])) * Math.PI / 180;
  return pts[pts.length - 1][1] * Math.PI / 180;
}
function flyObject(obj, opt) {
  validateObject(obj);
  const L = LCH, G0 = L.G0, D = Math.PI / 180, S0 = obj.start, tl = obj.timeline.slice().sort((a, b) => a.t - b.t), tLast = tl[tl.length - 1].t, dryKg = obj.dryKg || 0;
  const az = (S0.azimuthDeg != null ? S0.azimuthDeg : 90) * D, el = (S0.elevationDeg != null ? S0.elevationDeg : 90) * D, sp0 = S0.speedMs || 0;
  const wEff = L.WE * Math.cos(S0.lat * D) * Math.sin(az);   // composante de la rotation de la Terre le long de la trajectoire
  const r0 = L.RE + (S0.altitudeKm != null ? S0.altitudeKm * 1000 : S0.altitudeM || 0);
  let x = r0, y = 0, vx = sp0 * Math.sin(el), vy = sp0 * Math.cos(el) + (S0.frame === 'inertial' ? 0 : wEff * r0);
  const pitchPts = tl.filter(k => k.pitch != null).map(k => [k.t, k.pitch]);
  let m = obj.massKg || 1000, thrustN = 0, accel = null, isp = 0, burn = null, cdA = obj.cdA != null ? obj.cdA : 5, phase = 'vol', next = 0, t = 0;
  const events = [], samples = []; let nextSample = 0, maxQ = { q: 0, t: 0 }, ok = false, crashed = false, reason = 'time';
  const record = (e) => { events.push({ t, label: e.label || e.key, key: e.key || ('k' + events.length), x, y, vx, vy, alt: Math.hypot(x, y) - L.RE, v: Math.hypot(vx, vy) }); };
  const apply = k => {
    if (k.massKg != null) m = k.massKg;
    if (k.thrustN != null) { thrustN = k.thrustN; accel = null; } if (k.accelMs2 != null) { accel = k.accelMs2; thrustN = 0; }
    if (k.isp != null) isp = k.isp; if (k.burnKgS != null) burn = k.burnKgS; if (k.cdA != null) cdA = k.cdA; if (k.phase) phase = k.phase;
    if (k.speedMs != null) {   // vitesse par rapport au sol imposée, direction conservée
      const ax = vx + wEff * y, ay = vy - wEff * x, s = Math.hypot(ax, ay), f = s > 1e-9 ? k.speedMs / s : 0; vx = ax * f - wEff * y; vy = ay * f + wEff * x;
    }
    if (k.label || k.key) record(k);
  };
  const tEnd = opt && opt.tmax ? opt.tmax : (obj.maxDurationS || 20000);
  let orbit = null;
  while (t < tEnd) {
    while (next < tl.length && t >= tl[next].t - 1e-6) apply(tl[next++]);
    const r = Math.hypot(x, y), ux = x / r, uy = y / r, ex = -uy, ey = ux, h = r - L.RE, vr = vx * ux + vy * uy, vt = vx * ex + vy * ey, air = Math.exp(-h / 7200);
    const powered = t < tLast - 1e-9 && m > dryKg + 1e-6;
    let F = 0, md = 0;
    if (powered) { F = accel != null ? accel * m : thrustN; md = burn != null ? burn : (isp > 0 ? F / (isp * G0) : 0); if (F > 0 && md * 0.1 > m - dryKg && md > 0) { const f = (m - dryKg) / (md * 0.1); F *= f; md *= f; } }
    const phi = objectPitch(pitchPts, t), tx = ux * Math.sin(phi) + ex * Math.cos(phi), ty = uy * Math.sin(phi) + ey * Math.cos(phi);
    const fa = phAccel(x, y, vx, vy, m, F, tx, ty, cdA, wEff), q = fa.q, g = fa.g, ax = fa.ax, ay = fa.ay; if (q > maxQ.q) maxQ = { q, t };
    const dt = F > 0 || h < 120e3 ? 0.1 : 0.5;
    if (t >= nextSample - 1e-9) { samples.push({ t, x, y, vx, vy, m, F, phi: F > 0 ? phi : Math.atan2(vr, vt), phase, alt: h, v: Math.hypot(vx, vy), vr, vt, acc: Math.hypot(ax + g * ux, ay + g * uy) / G0, q, eap: false, epc: F > 0, esc: false, fairing: false, epcAttached: true, eapAttached: false }); nextSample += L.SAMPLE; }
    if (t >= tLast - 1e-9 && F === 0) {   // plus de moteur : l'orbite est-elle stable ? (périgée au-dessus de l'atmosphère)
      orbit = lchElements(r, vr, vt);
      if (orbit.rp > L.RE + 100e3 && orbit.e < 1 && t >= tLast + 1) { ok = true; reason = 'orbit'; break; }
      if (orbit.e >= 1 && h > 2e6) { reason = 'escape'; break; }
    }
    if (md > 0) m = Math.max(dryKg, m - md * dt);
    vx += ax * dt; vy += ay * dt; x += vx * dt; y += vy * dt; t += dt;
    if (Math.hypot(x, y) < L.RE - 1 && t > 5) { record({ label: 'Impact', key: 'crash' }); crashed = true; reason = 'impact'; break; }
  }
  const r = Math.hypot(x, y), ux = x / r, uy = y / r, vr = vx * ux + vy * uy, vt = vx * -uy + vy * ux; orbit = lchElements(r, vr, vt);
  if (ok) {   // dernier échantillon = état final exact
    const last = samples[samples.length - 1];
    if (t - last.t > 1e-6) samples.push(Object.assign({}, last, { t, x, y, vx, vy, m, F: 0, acc: 0, q: 0, alt: r - L.RE, v: Math.hypot(vx, vy), vr, vt, epc: false, phase: 'en orbite' }));
    record({ label: 'En orbite', key: 'objectOrbit' });
  }
  const km = v => Math.round(v / 1000);
  const message = ok ? 'Orbite atteinte : ' + km(orbit.rp - L.RE) + ' × ' + km(orbit.ra - L.RE) + ' km.'
    : crashed ? 'Trop lent : l\'objet retombe sur la Terre (impact après ' + Math.round(t) + ' s, apogée ' + km(Math.max(...samples.map(s => s.alt))) + ' km).'
    : reason === 'escape' ? 'Vitesse de libération dépassée : l\'objet quitte la Terre.' : 'Fin de la simulation sans orbite stable.';
  return { target: ok ? (orbit.rp - L.RE) / 1000 : 0, samples, events, orbit, ok, crashed, reason, message, tEnd: t, state: { x, y, vx, vy }, maxQ, payload: 0, final: { alt: (r - L.RE) / 1000, v: Math.hypot(vx, vy) }, object: obj };
}

// description 3D d'un objet (même forme que les fusées de js/rockets.js) : un simple cylindre, sans boosters ni coiffe ; visual { name, lengthM, radiusM, color }
function objectToSpec(obj) {
  const vis = obj.visual || {}, r = vis.radiusM || 1.5, h = vis.lengthM || 20, col = typeof vis.color === 'string' ? parseInt(vis.color.replace('#', ''), 16) : (vis.color != null ? vis.color : 0xdddddd), name = vis.name || obj.name || 'Objet';
  return { name, short: name, maxPayload: 1e12, phys: { eap: { dry: 0 }, epc: { dry: 0, prop: 0 }, fairing: 0, direct: false }, names: { booster: '', stage1: name, stage2: '' },
    model: { core: { r, h, color: col }, boosters: null, upper: { r: r * 0.99, h: 0.01, color: col }, fairing: { r: r * 0.99, cyl: 0.01, cone: 0.01, color: col }, noz: { epc: r * 1.2, eap: 0, esc: 0 } }, tower: false, sepDv: {} };
}
