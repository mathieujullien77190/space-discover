// Simulation d'un lancement depuis Kourou (Centre spatial guyanais, 5,236° N, 52,775° O) : une fusée de type Ariane 5 ECA SIMPLIFIÉE monte vers l'est et dépose un satellite sur une orbite circulaire.
// Physique : plan 2D inertiel (le plan de la trajectoire, vers l'est ; l'orbite obtenue est inclinée de ~5,2° comme la latitude de Kourou), gravité en 1/r², traînée atmosphérique (densité exponentielle, vent relatif dû à la rotation de la Terre),
// poussée avec impulsion spécifique variant avec la pression, consommation de propergol, séparation des étages. Intégration à pas fixe (0,1 s) calculée d'un coup au décollage ; la lecture rejoue l'échantillon.
// Guidage : verticale 8 s, inclinaison (« kick »), virage gravitationnel, puis suivi d'altitude jusqu'à l'orbite de parking (≤ 200 km), arrêt du moteur central quand le périgée est assez haut, étage supérieur : transfert (type Hohmann)
// jusqu'à l'altitude visée puis circularisation à l'apogée. Valeurs du lanceur : ordres de grandeur écrits de mémoire (masse au décollage ≈ 760 t, 2 boosters à poudre de 240 t de propergol, moteur Vulcain 2, étage ESC-A) — à vérifier.
// Pas de DOM ici : fonctions pures, testées dans Node (tools/test/launch.test.js).
const LCH = {
  MU: 3.986004418e14, RE: 6378137, WE: 7.2921159e-5, G0: 9.80665, LAT: 5.236, LON: -52.775, DT: 0.1, SAMPLE: 0.5,
  eap: { n: 2, prop: 240e3, dry: 33e3, burn: 130, ispV: 275, ispS: 250 },      // boosters à poudre : par booster
  epc: { prop: 170e3, dry: 12.2e3, burn: 540, ispV: 432, ispS: 310 },          // étage principal (Vulcain 2)
  esc: { prop: 14.9e3, dry: 4.5e3, F: 67e3, isp: 446 },                        // étage supérieur (HM7B)
  fairing: 2.4e3, fairingAt: 200, sepEap: 132, sepDelay: 4, escDelay: 6,
  cdA: 20,                                                                       // surface × coefficient de traînée (m²)
  kickAt: 8, kickDur: 5, kick: 5.5,                                              // inclinaison initiale (°) pour amorcer le virage
  parkMax: 200,                                                                  // altitude de parking maximale (km)
};
const lchEapShape = t => (1.35 - 0.55 * t / 130) / 1.075;   // profil de poussée des boosters à poudre : fort à l'allumage, décroissant (intégrale = 1 : même propergol consommé)
const lchRho = h => 1.225 * Math.exp(-Math.max(h, 0) / 7200);
// éléments orbitaux d'un état (r, vitesse radiale, vitesse tangentielle) en SI
function lchElements(r, vr, vt) {
  const mu = LCH.MU, v2 = vr * vr + vt * vt, E = v2 / 2 - mu / r, h = r * vt, e = Math.sqrt(Math.max(0, 1 + 2 * E * h * h / (mu * mu))), p = h * h / mu;
  const a = E < 0 ? -mu / (2 * E) : Infinity;
  return { E, h, e, p, a, rp: p / (1 + e), ra: E < 0 ? p / (1 - e) : Infinity, T: E < 0 ? 2 * Math.PI * Math.sqrt(a * a * a / mu) : Infinity };
}

// simulation complète ; target = altitude visée (km). Retourne { samples, events, orbit, ok, ... }
function simulateLaunch(targetKm, opt) {
  const L = LCH, o = Object.assign({ payload: 9e3 }, opt || {}), dt = L.DT, rt = L.RE + targetKm * 1000, park = L.RE + Math.min(targetKm, L.parkMax) * 1000;
  const wEff = L.WE * Math.cos(L.LAT * Math.PI / 180);
  let t = 0, x = L.RE, y = 0, vx = 0, vy = wEff * L.RE;
  let propEap = L.eap.n * L.eap.prop, propEpc = L.epc.prop, propEsc = L.esc.prop;
  let eapOn = true, epcOn = true, epcAttached = true, eapAttached = true, fairing = true, escOn = false, payload = true;
  const events = [], samples = []; let nextSample = 0, phase = 'montée', tCut = null, tEpcSep = null, esc1End = false, coasting = false, esc2 = false, done = false, maxQ = { q: 0, t: 0 }, burn1End = null;
  const mass = () => (eapAttached ? L.eap.n * (L.eap.dry + 0) + propEap : 0) + (epcAttached ? L.epc.dry + propEpc : 0) + L.esc.dry + propEsc + (fairing ? L.fairing : 0) + (payload ? o.payload : 0);
  const ev = (label, key) => { events.push({ t, label, key, x, y, vx, vy, alt: Math.hypot(x, y) - L.RE, v: Math.hypot(vx, vy) }); };
  let prevVr = 0, rHold = rt;
  while (t < 12000 && !done) {
    const r = Math.hypot(x, y), ux = x / r, uy = y / r, ex = -uy, ey = ux, h = r - L.RE, vr = vx * ux + vy * uy, vt = vx * ex + vy * ey, v = Math.hypot(vx, vy);
    const wx = -wEff * y, wy = wEff * x, vrx = vx - wx, vry = vy - wy, vrel = Math.hypot(vrx, vry), air = Math.exp(-h / 7200);
    const m = mass(); let F = 0, mdot = 0, dragF = 0;
    // moteurs
    if (eapOn && eapAttached && propEap > 0) { const md = L.eap.n * L.eap.prop / L.eap.burn * lchEapShape(t); F += md * (L.eap.ispV - (L.eap.ispV - L.eap.ispS) * air) * L.G0; mdot += md; }
    if (epcOn && epcAttached && propEpc > 0) { const md = L.epc.prop / L.epc.burn; F += md * (L.epc.ispV - (L.epc.ispV - L.epc.ispS) * air) * L.G0; mdot += md; }
    if (escOn && propEsc > 0) { F += L.esc.F; mdot += L.esc.F / (L.esc.isp * L.G0); }
    // événements
    if (eapAttached && (t >= L.sepEap || propEap <= 0)) { eapAttached = false; ev('Séparation des boosters à poudre', 'eap'); }
    if (fairing && t >= L.fairingAt) { fairing = false; ev('Largage de la coiffe', 'fairing'); }
    const el = lchElements(r, vr, vt);
    // arrêt du moteur central : orbite de parking presque atteinte (périgée assez haut) ou propergol épuisé
    if (epcOn && !eapAttached && ((el.rp >= L.RE + Math.min(0.5 * (park - L.RE), 100e3) && el.ra >= park - 3e3 && vr < 60) || propEpc <= 0)) { epcOn = false; tCut = t; ev('Arrêt du moteur principal', 'meco'); }
    if (tCut !== null && epcAttached && t >= tCut + L.sepDelay) { epcAttached = false; tEpcSep = t; ev('Séparation de l’étage principal', 'epcsep'); }
    if (tEpcSep !== null && !escOn && !esc1End && !coasting && !esc2 && t >= tEpcSep + L.escDelay) { escOn = true; ev('Allumage de l’étage supérieur', 'esc1'); phase = 'transfert'; }
    // commande de poussée : angle de la poussée au-dessus de l'horizontale locale (φ)
    let phi = Math.PI / 2;
    if (t >= L.kickAt && t < L.kickAt + L.kickDur) phi = Math.PI / 2 - L.kick * Math.PI / 180;
    else if (t >= L.kickAt + L.kickDur) {
      const gt = Math.atan2(vrx * ux + vry * uy, vrx * ex + vry * ey);   // angle de la vitesse relative à l'air
      if (eapAttached || t < L.sepEap + 20) phi = gt;                       // virage gravitationnel
      else if (!escOn) {                                                    // moteur central : suivi d'altitude
        const A = F / m, g = L.MU / (r * r), vstar = Math.max(-100, Math.min(200, 0.02 * (park - r))), acmd = 0.25 * (vstar - vr);
        phi = Math.asin(Math.max(-0.2, Math.min(1, (acmd + g - vt * vt / r) / Math.max(A, 1))));
      } else if (esc2) {                                                    // circularisation : on garde l'altitude pendant que la vitesse monte
        const A = F / m, g = L.MU / (r * r), vstar = Math.max(-50, Math.min(50, 0.05 * (rHold - r))), acmd = 0.5 * (vstar - vr);
        phi = Math.asin(Math.max(-0.5, Math.min(0.5, (acmd + g - vt * vt / r) / Math.max(A, 1))));
      } else phi = Math.atan2(vr, vt);                                      // 1re poussée de l'étage supérieur : le long de la vitesse
    }
    // forces
    const q = 0.5 * lchRho(h) * vrel * vrel; if (q > maxQ.q) maxQ = { q, t };
    dragF = q * L.cdA;
    const tx = ux * Math.sin(phi) + ex * Math.cos(phi), ty = uy * Math.sin(phi) + ey * Math.cos(phi), g = L.MU / (r * r);
    const ax = F / m * tx - g * ux - (vrel > 1e-6 ? dragF / m * vrx / vrel : 0), ay = F / m * ty - g * uy - (vrel > 1e-6 ? dragF / m * vry / vrel : 0);
    if (t >= nextSample) { samples.push({ t, x, y, vx, vy, m, F, phi, phase, alt: h, v, vr, vt, acc: Math.hypot(ax + g * ux, ay + g * uy) / L.G0, q, eap: eapAttached && propEap > 0, epc: epcOn && epcAttached && propEpc > 0, esc: escOn && propEsc > 0, fairing, epcAttached, eapAttached }); nextSample += L.SAMPLE; }
    // phases de l'étage supérieur
    if (escOn && !esc1End && !esc2) {   // première poussée : monter l'apogée jusqu'à l'altitude visée
      if (el.ra >= rt - 1000 || propEsc <= 0) { escOn = false; esc1End = true; coasting = true; burn1End = t; phase = 'transfert (sans poussée)'; ev('Fin de la 1re poussée', 'esc1end'); }
      if (el.ra >= rt - 1000 && Math.abs(park - rt) < 1) { /* parking = cible : circularisation directe */ }
    }
    if (coasting && vr < 0 && prevVr >= 0 && r > L.RE + 1e5) { coasting = false; esc2 = true; escOn = true; rHold = r; phase = 'circularisation'; ev('Allumage à l’apogée (circularisation)', 'esc2'); }
    if (esc2 && escOn && (vt >= Math.sqrt(L.MU / r) || propEsc <= 0)) { escOn = false; esc2 = false; done = true; phase = 'en orbite'; ev('Extinction : orbite atteinte', 'esc2end'); }
    // intégration (semi-implicite)
    if (mdot > 0) { const dm = mdot * dt; if (eapOn && eapAttached) propEap = Math.max(0, propEap - L.eap.n * L.eap.prop / L.eap.burn * lchEapShape(t) * dt); if (epcOn && epcAttached) propEpc = Math.max(0, propEpc - L.epc.prop / L.epc.burn * dt); if (escOn) propEsc = Math.max(0, propEsc - L.esc.F / (L.esc.isp * L.G0) * dt); }
    vx += ax * dt; vy += ay * dt; x += vx * dt; y += vy * dt; t += dt; prevVr = vr;
    if (Math.hypot(x, y) < L.RE - 1 && t > 5) { ev('Impact', 'crash'); break; }
  }
  const r = Math.hypot(x, y), ux = x / r, uy = y / r, vr = vx * ux + vy * uy, vt = vx * -uy + vy * ux, orbit = lchElements(r, vr, vt);
  const crashed = events.some(e => e.key === 'crash'), ok = done && !crashed;
  if (ok) {   // dernier échantillon = état final exact (la lecture prolonge l'orbite à partir de lui)
    const last = samples[samples.length - 1];
    if (t - last.t > 1e-6) samples.push(Object.assign({}, last, { t, x, y, vx, vy, m: mass(), F: 0, acc: 0, q: 0, alt: r - L.RE, v: Math.hypot(vx, vy), vr, vt, eap: false, epc: false, esc: false, phase: 'en orbite' }));
    ev('Satellite largué', 'sat');
  }
  return { target: targetKm, samples, events, orbit, ok, crashed, tEnd: t, state: { x, y, vx, vy }, maxQ, propEscLeft: propEsc, payload: o.payload, final: { alt: (r - L.RE) / 1000, v: Math.hypot(vx, vy) } };
}
